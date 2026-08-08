import StoryCheckpoints from "./sections/StoryCheckpoints.jsx";
import StoryClimbs from "./sections/StoryClimbs.jsx";
import StoryEnd from "./sections/StoryEnd.jsx";
import StoryHero from "./sections/StoryHero.jsx";
import StoryMap from "./sections/StoryMap.jsx";
import StoryNow from "./sections/StoryNow.jsx";
import StoryPace from "./sections/StoryPace.jsx";
import StoryStages from "./sections/StoryStages.jsx";
import StoryTerrain from "./sections/StoryTerrain.jsx";

// Single source of truth for which sections exist, in order — shared by
// Story.jsx (renders + observes them) and StoryDotNav.jsx (renders the jump
// list), which live in different subtrees (see storyNav.js's why-comment).
export const STORY_SECTIONS = [
  { id: "hero", label: "Overview", Component: StoryHero },
  { id: "map", label: "Map", Component: StoryMap },
  { id: "now", label: "Right now", Component: StoryNow },
  { id: "climbs", label: "Climbs", Component: StoryClimbs },
  { id: "terrain", label: "Terrain", Component: StoryTerrain },
  { id: "pace", label: "Pace", Component: StoryPace },
  { id: "stages", label: "Milestones", Component: StoryStages },
  { id: "checkpoints", label: "Checkpoints", Component: StoryCheckpoints },
  { id: "end", label: "End", Component: StoryEnd },
];
