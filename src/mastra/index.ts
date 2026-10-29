import { Mastra } from "@mastra/core/mastra";
import { nexoAssist } from "./agent";

export const mastra = new Mastra({ agents: { nexoAssist } });
