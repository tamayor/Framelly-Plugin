"""Regression tests for fixes in src/python/fusion_bridge.py found by the code audit (retry rules, caches, timing
maths, Glass / Spotlight / Track helpers), against small fake Fusion tools defined here.

Run:  python3 -m unittest discover -s test/python -v     (or: npm run test:py)"""

import os
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(HERE, "fakes"))
sys.path.insert(0, os.path.join(ROOT, "src", "python"))

import DaVinciResolveScript as dvr  # noqa: E402  (the fake)
import fusion_bridge as fb  # noqa: E402


class Inp(object):
    """tool.<Input>: its expression, ConnectTo, and no connected modifier."""
    def __init__(self, tool, name):
        self.tool, self.name = tool, name

    def GetExpression(self):
        return self.tool.exprs.get(self.name)

    def GetConnectedOutput(self):
        return None

    def ConnectTo(self, out):
        self.tool.connected.append((self.name, out))
        self.tool.mods.pop(self.name, None)
        return True


class FTool(object):
    def __init__(self, name, reg, inputs=None, exprs=None, mods=None, data=None):
        self.name, self.reg = name, reg
        self.inputs, self.exprs = dict(inputs or {}), dict(exprs or {})
        self.mods, self.data = dict(mods or {}), dict(data or {})
        self.extra, self.sets, self.connected = {}, [], []

    def GetAttrs(self):
        a = {"TOOLS_Name": self.name, "TOOLS_RegID": self.reg}
        a.update(self.extra)
        return a

    def SetAttrs(self, d):
        self.extra.update(d)

    def GetInput(self, k, time=None):
        return self.inputs.get(k)

    def SetInput(self, k, v, time=None):
        self.sets.append((k, v))
        if v is None:
            return      # what Fusion does with None is unknown: here it changes nothing
        self.inputs[k] = v

    def GetData(self, k):
        return self.data.get(k)

    def SetData(self, k, v):
        self.data[k] = v

    def __getattr__(self, name):
        if name.startswith("_") or name[:1].islower():
            raise AttributeError(name)
        return Inp(self, name)


class Wrapper(object):
    """A second Python object for the same tool (FindTool and GetToolList may hand out different ones)."""
    def __init__(self, tool):
        self._t = tool

    def __getattr__(self, name):
        return getattr(self._t, name)


class FComp(object):
    def __init__(self, tools, find_wrapper=False, attrs=None):
        self.tools, self.find_wrapper = list(tools), find_wrapper
        self.attrs = dict(attrs or {})

    def GetToolList(self, selected=False):
        return dict((float(i + 1), t) for i, t in enumerate(self.tools))

    def FindTool(self, name):
        for t in self.tools:
            if t.name == name:
                return Wrapper(t) if self.find_wrapper else t
        return None

    def GetAttrs(self):
        return dict(self.attrs)

    def Lock(self):
        pass

    def Unlock(self):
        pass


class Case(unittest.TestCase):
    def setUp(self):
        dvr.RESOLVE = None
        fb._resolve = None
        fb._items.clear()
        fb._seg_seen.clear()
        fb.comp_attrs_forget()
        fb.req_cache_clear()
        self._saved = []

    def patch(self, name, value):
        self._saved.append((name, getattr(fb, name)))
        setattr(fb, name, value)

    def tearDown(self):
        for name, value in reversed(self._saved):
            setattr(fb, name, value)
        fb.OPS.pop("_audit", None)


class NoSecondAttemptAfterAChange(Case):
    def test_a_multitext_is_scaled_once_when_a_later_step_fails(self):
        """PA-02: set_boxes scales by a factor; the automatic retry would scale the already scaled layers again."""
        mt = FTool("MultiText1", "MultiText", {"Text1.Size": 0.1, "Text1.Center": {1: 0.5, 2: 0.5}})
        runs = []

        def op(a):
            runs.append(1)
            fb.size_multitext(mt, 0.5)
            raise RuntimeError("stale handle after the resize")

        fb.OPS["_audit"] = op
        out = fb.handle({"id": 1, "op": "_audit", "args": {}})
        self.assertFalse(out["ok"])
        self.assertEqual(len(runs), 1)
        self.assertAlmostEqual(mt.inputs["Text1.Size"], 0.05)

    def test_a_flipped_effect_is_not_flipped_back_by_the_retry(self):
        """PB-04: fx_set with on = null adds the effect, fails after it, and the retry would take it off again."""
        class Eff(object):
            def __init__(self, name):
                self.name = name

            def GetInfo(self):
                return {"name": self.name}

            def GetIsEnabled(self):
                return True

            def SetIndex(self, i):
                return True

        class Clip(object):
            def __init__(self):
                self.effects = []

            def GetName(self):
                return "clip"

            def GetUniqueId(self):
                return "c1"

            def GetEffects(self, cat):
                return list(self.effects) if cat == "fusion" else []

            def AddEffect(self, cat, path):
                e = Eff(path.rsplit("/", 1)[-1])
                self.effects.append(e)
                return e

            def DeleteEffects(self, es):
                for e in es:
                    self.effects.remove(e)
                return True

        clip = Clip()
        fails = [True]

        def state(items, fresh=False):
            if fails.pop() if fails else False:
                raise RuntimeError("stale effect handle")
            return []

        self.patch("fx_targets", lambda a: [clip])
        self.patch("fx_in_nodes", lambda it, fresh=False: set())
        self.patch("fx_clip_is_sized", lambda it: False)
        self.patch("fx_sync_hold", lambda have, hold: None)
        self.patch("fx_nudge_inspector", lambda: None)
        self.patch("fx_state", state)
        out = fb.handle({"id": 1, "op": "fx_set", "args": {"effect": "Wiggle", "on": None}})
        self.assertFalse(out["ok"])
        self.assertEqual([e.name for e in clip.effects], ["ELSA Wiggle"])

    def test_a_request_that_changed_nothing_is_still_tried_twice(self):
        runs = []

        def op(a):
            runs.append(1)
            if len(runs) == 1:
                raise RuntimeError("stale")
            return "ok"

        fb.OPS["_audit"] = op
        self.assertEqual(fb.handle({"id": 1, "op": "_audit", "args": {}})["result"], "ok")
        self.assertEqual(len(runs), 2)


class AttrCache(Case):
    def test_a_baked_merge_stays_in_pass_through_for_the_tool_list_copy(self):
        """PA-03: bake_merge patches the FindTool object's cache entry; the tool list's own entry must follow."""
        merge = FTool("Merge1", "Merge")
        comp = FComp([FTool("Template", "TextPlus"), merge], find_wrapper=True)
        fb._comp_key[id(comp)] = (comp, ("clip-1", ""))
        listed = fb.tool_list(comp)
        for t in listed:
            fb.attrs(t)
        fb.bake_merge(comp, 2, True)
        self.assertTrue(merge.extra.get("TOOLB_PassThrough"))
        self.assertTrue(fb.attrs(listed[1])["TOOLB_PassThrough"])
        fb.req_cache_clear()        # the next request within the TTL reuses the positional copy
        fb._comp_key[id(comp)] = (comp, ("clip-1", ""))
        again = fb.tool_list(comp)
        self.assertTrue(fb.attrs(again[1])["TOOLB_PassThrough"])


class MirrorFollowers(Case):
    def test_set_text_leaves_an_expression_driven_follower_alone(self):
        """PA-04: writing a mirror follower's Text replaces its expression with plain text (cuts the link)."""
        src = FTool("Follower1", "StyledTextFollower", {"Text": "old"})
        mirror = FTool("Follower2", "StyledTextFollower", {"Text": "old"}, exprs={"Text": "Follower1.Text"})
        comp = FComp([src, mirror])
        self.patch("get_comp", lambda item, name=None: comp)
        self.assertIsInstance(fb.op_set_text({"item": "c", "text": "new", "light": True}), bool)
        self.assertEqual(src.inputs["Text"], "new")
        self.assertEqual(mirror.sets, [])

    def test_set_node_text_fallback_skips_a_mirror_follower(self):
        src = FTool("Follower1", "StyledTextFollower", {"Text": "old"})
        mirror = FTool("Follower2", "StyledTextFollower", {"Text": "old"}, exprs={"Text": "Follower1.Text"})
        box = FTool("Text1", "TextPlus", {"StyledText": "old"})
        fb.set_node_text(box, "StyledText", "new", [box, src, mirror], True)
        self.assertEqual(src.inputs["Text"], "new")
        self.assertEqual(mirror.sets, [])


class Gradient(Case):
    def test_a_black_first_stop_stays_black(self):
        """PA-05: `or 1` read a 0 colour channel as 1 (a black element got a white first stop)."""
        tool = FTool("Text1", "TextPlus", {"Red1": 0.0, "Green1": 0.0, "Blue1": 0.0, "Type1": 2})
        fb.apply_text_design(tool, {"elements": [{"index": 1, "color2": "#ff0000"}]})
        grads = [v for k, v in tool.sets if k == "ShadingGradient1"]
        if not grads:
            self.skipTest("apply_text_design takes elements in another shape")
        first = grads[-1][min(grads[-1])]
        self.assertEqual(first[:3], [0.0, 0.0, 0.0])


class Segments(Case):
    def test_seg_state_sees_segments_past_nine(self):
        """PA-11: seg_state stopped at Seg9, so a Seg10+ change never re-keyed."""
        ins = {}
        for n in range(1, 13):
            ins["Seg%dStart" % n], ins["Seg%dEnd" % n] = n, n + 5
        tpl = FTool("Template", "TextPlus", ins)
        comp = FComp([tpl], attrs={"COMPN_RenderStart": 0})
        before = fb.seg_state(comp, tpl)
        tpl.inputs["Seg12End"] = 40
        self.assertNotEqual(fb.seg_state(comp, tpl), before)
        self.assertEqual(len(before), 13)

    def test_timing_set_with_a_bad_segment_key_writes_nothing(self):
        """PB-11: a non-numeric key raised mid-loop after earlier ranges were already written."""
        tpl = FTool("Template", "TextPlus", {"Seg1Start": 0, "Seg1End": 10, "Seg2Start": 10, "Seg2End": 20})
        comp = FComp([tpl])
        self.patch("get_comp", lambda item, name=None: comp)
        self.patch("timing_tool", lambda c: (tpl, "Seg1Start", "segments"))
        out = fb.op_timing_set({"item": "c", "ranges": [{"key": 1, "start": 2, "end": 9}, {"key": "x", "start": 0, "end": 5}]})
        self.assertFalse(out["ok"])
        self.assertEqual(tpl.sets, [])
        legacy = fb.op_timing_set({"item": "c", "value": 30})      # the older single-value form on a segment clip
        self.assertFalse(legacy["ok"])


class HandleCaches(Case):
    def test_item_handles_are_capped(self):
        """PA-12: _items kept one TimelineItem for every id ever asked for."""
        items = [dvr.Item("id-%d" % i) for i in range(1003)]
        dvr.RESOLVE = dvr.Resolve(dvr.Timeline([items]))
        for it in items:
            fb.find_item(it.uid)
        self.assertLessEqual(len(fb._items), 1001)
        self.assertIs(fb.find_item("id-1002"), items[-1])


class CaptureUnique(Case):
    def test_held_frames_are_found_without_keeping_the_pngs(self):
        """PA-13: the frames are compared by digest; the result and the files kept are the same as before."""
        pics = [b"A", b"A", b"A", b"B", b"B", b"C"]

        class Clip(object):
            def ExportFrame(self, i, opts):
                with open(opts["filePath"], "wb") as fh:
                    fh.write(pics[i] * 1000)
                return {"success": True}

        with tempfile.TemporaryDirectory() as d:
            src = fb.capture_unique(Clip(), len(pics), 64, d, 1, None)
            self.assertEqual(src, [0, 0, 0, 3, 3, 5])
            self.assertEqual(sorted(os.listdir(d)), ["p00.png", "p03.png", "p05.png"])


class WordTimes(Case):
    def test_follower_word_times_apply_the_animation_start(self):
        """PB-02: the inverse of the AnimTime remap ignored Animation Start."""
        fol = FTool("Follower1", "StyledTextFollower", {"Text": "ab cd", "Delay": 5.0})
        tpl = FTool("Template", "TextPlus", {"AnimFrames": 50, "AnimStart": 20, "AnimNatural": 30})
        comp = FComp([tpl, fol])
        self.patch("word_fit_frame", lambda c, tt: None)
        # words at own time 0 and 15: S + tt * (T - S) / N = 20 and 35
        self.assertEqual(fb.follower_word_times(comp, tpl)["frames"], [20, 35])
        tpl.inputs["AnimFrames"] = 0
        self.assertEqual(fb.follower_word_times(comp, tpl)["frames"], [20, 35])
        tpl.inputs.update({"AnimFrames": 60, "AnimStart": 0})       # no start: unchanged from before
        self.assertEqual(fb.follower_word_times(comp, tpl)["frames"], [0, 30])

    def test_row_times_past_the_natural_length(self):
        """PB-09: a row whose own time is past AnimNatural landed at tt instead of D + tt - natural."""
        tpl = FTool("Template", "TextPlus", {"StepFrames": 5, "AnimStart": 0, "AnimFrames": 10, "AnimNatural": 20})
        pops = [FTool("Pop%d" % k, "StyledTextFollower", {"Text": "w"}) for k in range(1, 7)]
        comp = FComp([tpl] + pops)
        self.patch("get_comp", lambda item, name=None: comp)
        self.patch("fit_keys", lambda t: None)
        self.patch("kinetic_template", lambda c: (None, None))
        out = fb.op_row_times({"item": "c"})
        self.assertEqual(out["frames"], [0, 2, 5, 8, 10, 15])

    def test_unmap_is_the_inverse_of_remap(self):
        for AS, AF, NAT in ((0, 0, 30), (0, 50, 30), (20, 50, 30), (10, 25, 40)):
            for f in range(AS + 1, 120):
                tt = fb.remap_tt(f, 0, AS, AF, NAT)
                self.assertAlmostEqual(fb.unmap_tt(tt, AS, AF, NAT), f, places=6, msg=(AS, AF, NAT, f))


class Glass(Case):
    def test_an_effect_that_could_not_be_written_is_taken_off_again(self):
        """PB-06: an ELSA Glass added but not written stayed on the clip untagged, and every sync added another."""
        class Eff(object):
            def GetInfo(self):
                return {"name": fb.GLASS_NAME}

            def GetFusionComp(self):
                return None      # glass_write fails on it

        class Footage(object):
            def __init__(self):
                self.effects = []

            def GetEffects(self, cat):
                return list(self.effects)

            def AddEffect(self, cat, path):
                e = Eff()
                self.effects.append(e)
                return e

            def DeleteEffects(self, es):
                for e in es:
                    self.effects.remove(e)
                return True

            def GetName(self):
                return "footage"

            def GetStart(self):
                return 0

        foot = Footage()
        tpl = FTool("Template", "TextPlus")
        self.patch("find_item", lambda i: object())
        self.patch("get_comp", lambda i, name=None: FComp([tpl]))
        self.patch("glass_tpl", lambda c: tpl)
        self.patch("timeline", lambda: object())
        self.patch("glass_values", lambda it, comp, tpl, tl: {"text": "hi", "start": 0})
        self.patch("glass_under", lambda tl, it: [(foot, "f1")])
        self.patch("glass_reg_load", lambda: {})
        self.patch("glass_reg_save", lambda reg: None)
        self.patch("glass_tl_key", lambda tl: "tl")
        for _ in range(3):
            out = fb.glass_sync("cap-1")
            self.assertEqual(len(out["failed"]), 1)
        self.assertEqual(foot.effects, [])


class SpotlightKeys(Case):
    def test_a_constant_curve_disconnects_the_old_spline(self):
        """PB-12: the old spline was dropped with SetInput(inp, None); the file's proven way is ConnectTo(None)."""
        word = FTool("SpotWord", "TextPlus", mods={"Size": "spline"})
        self.patch("_fx_modifier", lambda tool, inp, reg: tool.mods.get(inp))
        fb._key_input(FComp([word]), word, "Size", [1.0, 1.0, 1.0], 0)
        self.assertEqual(word.connected, [("Size", None)])
        self.assertEqual(word.inputs["Size"], 1.0)


class TrackBake(Case):
    def bake(self, dur):
        class Spline(object):
            def __init__(self):
                self.keys = None

            def SetKeyFrames(self, ks, replace):
                self.keys = ks

        made = []

        class Comp(FComp):
            def BezierSpline(self):
                made.append(Spline())
                return made[-1]

            def XYPath(self):
                return FTool("Path1", "XYPath")

        class Clip(object):
            def GetProperty(self):
                return {}

            def GetStart(self):
                return 0

            def GetDuration(self):
                return dur

        class Effect(object):
            def GetFusionComp(self):
                return comp

        class Tl(object):
            def GetSetting(self, k):
                return None

        xf = FTool("XfTrack", "Transform")
        comp = Comp([xf], attrs={"COMPN_RenderStart": 0})
        track = {"0": [0.1, 0.5, 0.2, 0.2], "10": [0.9, 0.5, 0.2, 0.2]}       # nothing tracked on frames 1..9
        self.patch("track_read", lambda e: {"track": track, "anchor": 0})
        self.patch("track_values", lambda t, d: {"Smooth": 0.0, "FollowX": 1.0, "FollowY": 1.0, "FollowScale": 0.0, "FollowRot": 0.0})
        self.patch("timeline", lambda: Tl())
        self.patch("_fx_modifier", lambda tool, inp, reg: None)
        return fb.fx_bake_track(Effect(), Clip(), force=True), made

    def test_a_gap_holds_the_nearest_tracked_frame(self):
        """PB-10: across a gap the next tracked frame was always taken (the subject jumped at the gap's start)."""
        ok, made = self.bake(11)
        self.assertTrue(ok)
        x = made[2].keys      # Angle, Size, then Center X
        self.assertAlmostEqual(x[4][1], 0.5)       # frame 4 is nearer frame 0 (x 0.1, the anchor)
        self.assertAlmostEqual(x[6][1], 1.3)       # frame 6 is nearer frame 10 (x 0.9)

    def test_a_zero_length_clip_is_not_keyed(self):
        """PB-10: dur 0 indexed an empty list ("list index out of range")."""
        ok, made = self.bake(0)
        self.assertFalse(ok)
        self.assertEqual(made, [])


if __name__ == "__main__":
    unittest.main()
