import { buildProgram } from './program';
import { runTuiMenu } from './tui';
import './defines';

export const program = buildProgram();

export async function RunCli(): Promise<void> {
  await runTuiMenu();
}

export default RunCli;
