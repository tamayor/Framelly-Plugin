// Standalone entry for sample scenes (not registered in Root.tsx).
import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { EnvelopeSample } from './EnvelopeSample';

const SampleRoot: React.FC = () =>
    React.createElement(Composition, { id: 'EnvelopeSample', component: EnvelopeSample, width: 1080, height: 1920, fps: 30, durationInFrames: 300 });
registerRoot(SampleRoot);
