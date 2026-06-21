import type { TCallCommand } from "../../commands/types/call-command.type";
import type { TDeleteCommand } from "../../commands/types/delete-command.type";
import type { TMoveCommand } from "../../commands/types/move-command.type";
import type { TSelectCommand } from "../../commands/types/select-command.type";
import type { TStyleCommand } from "../../commands/types/style-command.type";
import type { TTypeCommand } from "../../commands/types/type-command.type";
import type { TUnselectCommand } from "../../commands/types/unselect-command.type";
import type { TUnstyleCommand } from "../../commands/types/unstyle-command.type";
import type { TWaitCommand } from "../../commands/types/wait-command.type";



/**
 * @description
 * Union of all supported command types
 */
export type TCommand = TTypeCommand | TWaitCommand | TDeleteCommand | TMoveCommand | TSelectCommand | TUnselectCommand | TStyleCommand | TUnstyleCommand | TCallCommand;
