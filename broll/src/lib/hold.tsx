// Still at end (common prop `holdEnd`, seconds): the last `holdEnd` seconds of the clip show one frozen frame, so
// every build, count, wobble, boil and blinking caret has stopped and the cut lands on a still graphic. Wraps the
// whole effect (outside withHand, so the hand boil stops too) with Remotion's Freeze.
import React from 'react';
import { Freeze, useCurrentFrame, useVideoConfig } from 'remotion';

type HoldProps = { holdEnd?: number };

export function withHold<P extends HoldProps>(Comp: React.FC<P>): React.FC<P> {
    const Wrapped: React.FC<P> = (p) => {
        const frame = useCurrentFrame();
        const { fps, durationInFrames: D } = useVideoConfig();
        const hold = Math.round(Math.max(0, Number(p.holdEnd) || 0) * fps);
        const last = D - 1 - hold;   // the last frame that moves
        if (hold <= 0 || last < 1 || frame <= last) return <Comp {...p} />;
        return (
            <Freeze frame={last}>
                <Comp {...p} />
            </Freeze>
        );
    };
    return Wrapped;
}
