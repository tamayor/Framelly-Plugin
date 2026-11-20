"""Regressions for the Python helpers: Match Cut (news_match_cut.py), the Cut tab's envelope and cache (auto_cut.py),
Track Subject's input checks (subject_tracker.py), the matte writers (subject_matte.py, broll_cutout.py) and the
comment handling of tools/check-inspector-safe.js. No network, browser, ffmpeg or Resolve: fakes stand in for them.
Parts that need Pillow, numpy, OpenCV or node are skipped in a Python / machine without them."""
import io
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import unittest
import urllib.error
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PY_DIR = os.path.join(ROOT, "src", "python")
sys.path.insert(0, PY_DIR)
sys.dont_write_bytecode = True

try:
    import news_match_cut as NMC
except ImportError:  # no Pillow in this Python
    NMC = None
import auto_cut as AC  # noqa: E402
import subject_tracker as ST  # noqa: E402

try:
    import cv2  # noqa: F401
    import subject_matte as SM
    import broll_cutout as BC
except ImportError:  # no OpenCV in this Python
    SM = BC = None


def tmpdir(test):
    d = tempfile.mkdtemp(prefix="framelly-test-")
    test.addCleanup(shutil.rmtree, d, True)
    return d


@unittest.skipUnless(NMC is not None, "Pillow is not installed in this Python")
class MatchCut(unittest.TestCase):
    def test_held_frames_are_copied_where_the_drive_has_no_hard_links(self):
        d = tmpdir(self)
        src, dst = os.path.join(d, "00000.png"), os.path.join(d, "00001.png")
        with open(src, "wb") as f:
            f.write(b"frame")
        with mock.patch.object(NMC.os, "link", side_effect=OSError(45, "Operation not supported")):
            NMC.hold_frame(src, dst)
        with open(dst, "rb") as f:
            self.assertEqual(f.read(), b"frame")

    def test_a_punctuation_only_word_finds_nothing_instead_of_dividing_by_zero(self):
        rows = [dict(line=(1, 1, 1), x=0, y=0, w=20, h=20, conf=90.0, text="Hello")]
        with mock.patch.object(NMC, "ocr_words", return_value=rows):
            self.assertIsNone(NMC.find_word("x.png", "!!!", 55))
            self.assertEqual(NMC.find_word("x.png", "hello", 55), (0, 0, 20, 20))

    def test_a_punctuation_only_word_stops_before_any_screenshot(self):
        d = tmpdir(self)
        r = subprocess.run([sys.executable, "-B", os.path.join(PY_DIR, "news_match_cut.py"), "...", "--out-dir", d],
                           capture_output=True, text=True, timeout=60)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("no letters or digits", r.stderr)
        self.assertNotIn("Traceback", r.stderr)

    def test_screenshots_are_cached_per_article_url(self):
        a, b = NMC.shot_name("https://a.example/1"), NMC.shot_name("https://b.example/2")
        self.assertNotEqual(a, b)
        self.assertEqual(a, NMC.shot_name("https://a.example/1"))
        d = tmpdir(self)
        small = os.path.join(d, a)
        with open(small, "wb") as f:
            f.write(b"x" * 100)                      # a blank page / bot wall from an earlier run
        self.assertFalse(NMC.good_shot(small))
        with open(small, "wb") as f:
            f.write(b"x" * (NMC.MIN_SHOT_BYTES + 1))
        self.assertTrue(NMC.good_shot(small))

    def test_news_results_offline_give_a_readable_message(self):
        with mock.patch.object(NMC.urllib.request, "urlopen", side_effect=urllib.error.URLError("nodename nor servname")):
            with self.assertRaises(SystemExit) as cm:
                NMC.news_links("AI", 3, "en-US")
        self.assertIn("Could not get news results", str(cm.exception.code))

    def test_news_items_without_a_link_are_dropped(self):
        rss = (b"<rss><channel><item><title>No link</title></item>"
               b"<item><title>One</title><link>https://news.google.com/rss/articles/abc</link></item></channel></rss>")
        with mock.patch.object(NMC.urllib.request, "urlopen", return_value=io.BytesIO(rss)), \
                mock.patch.object(NMC, "decode_link", return_value=None):
            self.assertEqual(NMC.news_links("AI", 3, "en-US"), [("https://news.google.com/rss/articles/abc", "One")])

    def test_cancel_stops_the_headless_browsers_and_removes_their_profiles(self):
        d = tmpdir(self)
        info = os.path.join(d, "browser.txt")
        fake = os.path.join(d, "fake-browser")
        with open(fake, "w") as f:                  # writes its pid and profile folder, then hangs like a slow page
            f.write('#!/bin/sh\nfor a in "$@"; do case "$a" in --user-data-dir=*) prof="${a#--user-data-dir=}";; '
                    'esac; done\necho "$$ $prof" > "%s"\nexec sleep 30\n' % info)
        os.chmod(fake, 0o755)
        code = ("import signal, sys; sys.path.insert(0, %r); import news_match_cut as N; "
                "signal.signal(signal.SIGTERM, N.on_term); N.screenshot(%r, 'https://example.com/a', %r)"
                % (PY_DIR, fake, os.path.join(d, "shot.png")))
        env = dict(os.environ, TMPDIR=d)
        p = subprocess.Popen([sys.executable, "-B", "-c", code], env=env, start_new_session=True)
        try:
            t0 = time.time()
            while not (os.path.exists(info) and open(info).read().strip()) and time.time() - t0 < 20:
                time.sleep(0.05)
            pid, prof = open(info).read().split()
            self.assertTrue(os.path.isdir(prof))
            os.killpg(p.pid, signal.SIGTERM)        # what match-cut.js does on Cancel
            p.wait(timeout=10)
        finally:
            if p.poll() is None:
                p.kill()
        t0 = time.time()
        while time.time() - t0 < 5:
            try:
                os.kill(int(pid), 0)
            except ProcessLookupError:
                break
            time.sleep(0.05)
        else:
            os.kill(int(pid), signal.SIGKILL)
            self.fail("the headless browser kept running after Cancel")
        self.assertFalse(os.path.exists(prof), "the browser profile was left behind")


@unittest.skipIf(AC.np is None, "numpy is not installed for this Python")
class CutEngine(unittest.TestCase):
    def reference(self, x):
        """The envelope as it was first written: one float64 cumulative sum over the whole stream."""
        np = AC.np
        c = np.concatenate(([0.0], np.cumsum(x.astype(np.float64) ** 2)))
        n = len(x) // AC.HOP
        centres = np.arange(n) * AC.HOP + AC.HOP // 2
        lo = np.clip(centres - AC.WIN // 2, 0, len(x))
        hi = np.clip(centres + AC.WIN // 2, 0, len(x))
        return (10 * np.log10((c[hi] - c[lo]) / np.maximum(hi - lo, 1) + 1e-12)).astype(np.float32)

    def test_chunked_envelope_matches_the_whole_stream_formula(self):
        rng = AC.np.random.default_rng(3)
        for n in (AC.WIN, AC.WIN + 1, 16000 * 2 + 77, AC.HOP // 2 * 65536 + 13):
            x = (rng.standard_normal(n) * 0.2).astype(AC.np.float32)
            got, want = AC.envelope(x), self.reference(x)
            self.assertEqual(got.shape, want.shape)
            self.assertLess(float(AC.np.abs(got - want).max()), 1e-3)

    def test_cache_drops_the_least_recently_used_entries_over_the_cap(self):
        d = tmpdir(self)
        now = time.time()
        for i, key in enumerate(("old", "mid", "new")):
            for ext, size in ((".npy", 600), (".json", 40)):
                p = os.path.join(d, key + ext)
                with open(p, "wb") as f:
                    f.write(b"x" * size)
                os.utime(p, (now - 100 + i * 10, now - 100 + i * 10))
        with open(os.path.join(d, "notes.txt"), "w") as f:
            f.write("not ours")
        AC.prune_cache(d, max_bytes=1300)
        self.assertEqual(sorted(os.listdir(d)), ["mid.json", "mid.npy", "new.json", "new.npy", "notes.txt"])

    def test_malformed_request_still_ends_with_a_result_line(self):
        r = subprocess.run([sys.executable, "-B", os.path.join(PY_DIR, "auto_cut.py")], input="{not json",
                           capture_output=True, text=True, timeout=60)
        last = r.stdout.strip().splitlines()[-1]
        self.assertTrue(last.startswith("RESULT "), r.stdout + r.stderr)
        self.assertIn("error", json.loads(last[7:]))


class TrackerInput(unittest.TestCase):
    def test_no_frames_is_reported_in_words(self):
        r = subprocess.run([sys.executable, "-B", os.path.join(PY_DIR, "subject_tracker.py")],
                           input=json.dumps({"dir": "/nowhere", "frames": [], "anchor": 0, "box": [0, 0, 1, 1]}),
                           capture_output=True, text=True, timeout=60)
        self.assertEqual(json.loads(r.stdout.strip().splitlines()[-1]), {"error": "No frames to track"})

    def test_box_is_kept_inside_the_picture(self):
        self.assertEqual(ST.clamp_box([0.1, 0.2, 0.3, 0.4], 100, 50), (10.0, 10.0, 30.0, 20.0))
        self.assertEqual(ST.clamp_box([0.9, -0.2, 0.3, 0.5], 100, 50), (90.0, 0.0, 10.0, 15.0))
        x, y, w, h = ST.clamp_box([1.5, 0.5, 0.2, 0.0], 100, 50)
        self.assertTrue(0 <= x and x + w <= 100 and w >= 4 and h >= 4)


@unittest.skipUnless(SM is not None, "OpenCV / numpy not installed in this Python")
class MatteWrites(unittest.TestCase):
    def test_a_failed_write_raises(self):
        img = AC.np.zeros((4, 4, 3), AC.np.uint8) if AC.np is not None else None
        bad = os.path.join(tmpdir(self), "gone", "c00000.png")
        for mod in (SM, BC):
            with self.assertRaises(RuntimeError):
                mod.write_image(bad, img, [])

    def test_crop_reports_an_unwritable_output(self):
        d = tmpdir(self)
        import numpy as np
        png = os.path.join(d, "c.png")
        rgba = np.zeros((20, 20, 4), np.uint8)
        rgba[5:15, 5:15] = 255
        cv2.imwrite(png, rgba)
        r = subprocess.run([sys.executable, "-B", os.path.join(PY_DIR, "broll_cutout.py")],
                           input=json.dumps({"op": "crop", "png": png, "out": os.path.join(d, "gone", "crop.png")}),
                           capture_output=True, text=True, timeout=60)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn("could not write", json.loads(r.stdout.strip().splitlines()[-1])["error"])


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class InspectorCheckComments(unittest.TestCase):
    def code_part(self, line, ext):
        js = ("const { codePart } = require(%s); process.stdout.write(JSON.stringify(codePart(%s, %s)));"
              % (json.dumps(os.path.join(ROOT, "tools", "check-inspector-safe.js")), json.dumps(line), json.dumps(ext)))
        return json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)

    def test_strings_and_other_languages_markers_are_code(self):
        self.assertIn("comp.Paste(", self.code_part("setColor('#ffffff'); comp.Paste(x)", ".js"))
        self.assertIn("ImportFusionComp(", self.code_part("const u = 'https://x'; item.ImportFusionComp(p)", ".js"))
        self.assertIn("comp.Paste(", self.code_part("n = total // 2; comp.Paste(x)", ".py"))
        self.assertIn("comp:Paste(", self.code_part("local n = #t; comp:Paste(x)", ".lua"))

    def test_comments_are_still_dropped(self):
        self.assertNotIn("Paste", self.code_part("foo(); // comp.Paste( is risky", ".js"))
        self.assertNotIn("Paste", self.code_part("foo()  # comp.Paste( is risky", ".py"))
        self.assertNotIn("Paste", self.code_part("foo() -- comp:Paste( is risky", ".lua"))
        self.assertEqual(self.code_part("s = '# not a comment' # real", ".py"), "s = '# not a comment' ")


if __name__ == "__main__":
    unittest.main()
