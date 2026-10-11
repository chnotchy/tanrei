// The image the chip's `input-avatar` fixture draws (spec content "avatar"): one neutral grey pixel, no person and no
// text, so a baseline depends on nothing but the component. Inline, so the harness loads no file. The gallery has the
// same one (example/src/registry.tsx). The other platforms do not share this image.
import type { ImageSourcePropType } from 'react-native';

export const FIXTURE_AVATAR: ImageSourcePropType = {
  uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGOYN28eAAO4AdvqohIbAAAAAElFTkSuQmCC',
};
