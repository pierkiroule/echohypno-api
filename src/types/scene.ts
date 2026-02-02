import { SelectedMedia } from "./media";

export interface SceneRequest {
  emojis: string[];
  seed?: string;
}

export interface SceneMediaBundle {
  text: SelectedMedia;
  music: SelectedMedia;
  video: SelectedMedia;
  shader: SelectedMedia;
  voicePool: SelectedMedia[];
}

export interface SceneResponse {
  id: string;
  seed: string;
  archetype: string;
  sceneClimate: string | null;
  media: SceneMediaBundle;
}
