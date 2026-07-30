import React from "react";
import { Composition } from "remotion";
import { JourneyClip } from "./JourneyClip";
import { DEFAULT_PROPS, FPS, durationInFrames, type JourneyClipProps } from "./schema";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="JourneyClip"
      component={JourneyClip}
      durationInFrames={durationInFrames(DEFAULT_PROPS.steps.length)}
      fps={FPS}
      width={1280}
      height={800}
      defaultProps={DEFAULT_PROPS}
      // Duration follows the actual step count of whatever journey is passed in.
      calculateMetadata={({ props }: { props: JourneyClipProps }) => ({
        durationInFrames: durationInFrames(props.steps.length),
      })}
    />
  );
};
