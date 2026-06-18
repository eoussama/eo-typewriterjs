import type { TScenario } from "../scenario.type";

import { BASIC_SCENARIOS } from "./basic.scenarios";
import { CALLBACKS_SCENARIOS } from "./callbacks.scenarios";
import { CONTROLS_SCENARIOS } from "./controls.scenarios";
import { CURSOR_SCENARIOS } from "./cursor.scenarios";
import { EDITING_SCENARIOS } from "./editing.scenarios";
import { STYLING_SCENARIOS } from "./styling.scenarios";



export const SCENARIOS: readonly TScenario[] = [
  ...BASIC_SCENARIOS,
  ...EDITING_SCENARIOS,
  ...CURSOR_SCENARIOS,
  ...STYLING_SCENARIOS,
  ...CALLBACKS_SCENARIOS,
  ...CONTROLS_SCENARIOS,
];
