"""fusion_bridge.py drops its cached clip handles when the current timeline changes (tl_switch_check): a handle of a
clip on the old timeline still answers, so a late request would otherwise act on the old timeline.

Run:  python3 -m unittest discover -s test/python -v     (or: npm run test:py)"""

import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.dont_write_bytecode = True
sys.path.insert(0, os.path.join(HERE, "fakes"))
sys.path.insert(0, os.path.join(ROOT, "src", "python"))

import DaVinciResolveScript as dvr  # noqa: E402  (the fake)
import fusion_bridge as fb  # noqa: E402


class IdTimeline(dvr.Timeline):
    def __init__(self, uid, video_tracks):
        dvr.Timeline.__init__(self, video_tracks)
        self.uid = uid

    def GetUniqueId(self):
        return self.uid


class TimelineSwitchTest(unittest.TestCase):
    def setUp(self):
        self.saved = (dvr.RESOLVE, fb._resolve, fb._tl_id[0])
        self.old_item = dvr.Item("clip-1")
        self.tl_a = IdTimeline("tl-a", [[], [self.old_item]])
        self.tl_b = IdTimeline("tl-b", [[], []])
        self.res = dvr.Resolve(self.tl_a)
        dvr.RESOLVE = self.res
        fb._resolve = None
        fb._tl_id[0] = None
        fb._items.clear()
        fb._audio_items.clear()

    def tearDown(self):
        dvr.RESOLVE, fb._resolve, fb._tl_id[0] = self.saved
        fb._items.clear()
        fb._audio_items.clear()

    def test_same_timeline_keeps_the_caches(self):
        fb.tl_switch_check("controls_get")
        self.assertIs(fb.find_item("clip-1"), self.old_item)
        fb._audio_items["a-1"] = object()
        fb.tl_switch_check("controls_get")
        self.assertIn("clip-1", fb._items)
        self.assertIn("a-1", fb._audio_items)

    def test_switch_drops_the_old_timelines_handles(self):
        fb.tl_switch_check("controls_get")
        self.assertIs(fb.find_item("clip-1"), self.old_item)
        fb._audio_items["a-1"] = object()
        self.res.pm.project.timeline = self.tl_b      # the user opens another timeline
        fb.tl_switch_check("controls_set")
        self.assertEqual(fb._items, {})
        self.assertEqual(fb._audio_items, {})
        with self.assertRaises(RuntimeError):         # the old clip is not on the current timeline
            fb.find_item("clip-1")

    def test_timeline_free_ops_and_no_timeline_do_nothing(self):
        fb._items["clip-1"] = self.old_item
        self.res.pm.project.timeline = None
        fb.tl_switch_check("controls_get")            # no timeline open: nothing to compare
        fb.tl_switch_check("ping")
        self.assertIn("clip-1", fb._items)


if __name__ == "__main__":
    unittest.main()
