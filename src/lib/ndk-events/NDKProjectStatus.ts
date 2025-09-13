import {
  NDKEvent,
  type NDKKind,
  type NostrEvent,
} from "@nostr-dev-kit/ndk-hooks";
import type NDK from "@nostr-dev-kit/ndk-hooks";

export interface ProjectAgent {
  pubkey: string;
  name: string;
  isGlobal?: boolean; // true if agent is global
  model?: string; // Model slug this agent uses (e.g., "sonnet", "gpt-4o-mini")
  status?: string;
  lastSeen?: number;
  tools?: string[]; // Array of tool names this agent has access to
}

export interface ProjectModel {
  provider: string; // e.g., "anthropic/claude-sonnet-4"
  name: string; // e.g., "sonnet"
}

export interface ExecutionQueueItem {
  conversationId: string;
  startTime?: number;
  position?: number;
}

export interface ExecutionQueue {
  active: ExecutionQueueItem | null;
  waiting: ExecutionQueueItem[];
  totalWaiting: number;
}

export class NDKProjectStatus extends NDKEvent {
  static kind: NDKKind = 24010 as NDKKind;

  constructor(ndk?: NDK, rawEvent?: NostrEvent | NDKEvent) {
    super(ndk, rawEvent);
    this.kind = NDKProjectStatus.kind;
    if (!this.tags) {
      this.tags = [];
    }
    if (!this.content) {
      this.content = "";
    }
  }

  get projectId(): string | undefined {
    // Look for 'a' tag (NIP-33 reference)
    const aTag = this.tagValue("a");
    if (aTag) return aTag;

    // Fallback to 'e' tag
    return this.tagValue("e");
  }

  set projectId(value: string | undefined) {
    this.removeTag("a");
    this.removeTag("e");

    if (value) {
      // If it's a NIP-33 reference (contains colons), use 'a' tag
      if (value.includes(":")) {
        this.tags.push(["a", value]);
      } else {
        // Otherwise use 'e' tag for event ID
        this.tags.push(["e", value]);
      }
    }
  }

  // The project is online if this event exists and is recent
  get isOnline(): boolean {
    if (!this.created_at) return false;
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
    return this.created_at > fiveMinutesAgo;
  }

  get lastSeen(): Date | undefined {
    return this.created_at ? new Date(this.created_at * 1000) : undefined;
  }

  get agents(): ProjectAgent[] {
    const agents: ProjectAgent[] = [];
    const agentMap = new Map<string, ProjectAgent>(); // name -> agent

    // First pass: build agents from agent tags
    for (const tag of this.tags) {
      if (tag[0] === "agent" && tag[1]) {
        const agent: ProjectAgent = {
          pubkey: tag[1],
          name: tag[2] || "Unknown",
          isGlobal: tag[3] === "global",
          tools: [], // Initialize empty tools array
        };
        agents.push(agent);
        agentMap.set(agent.name, agent);
      }
    }

    // Second pass: add models to agents from model tags
    for (const tag of this.tags) {
      if (tag[0] === "model" && tag[1]) {
        const modelSlug = tag[1]; // e.g., "sonnet"
        // Elements 2+ are agent names that use this model
        for (let i = 2; i < tag.length; i++) {
          const agentName = tag[i];
          const agent = agentMap.get(agentName);
          if (agent) {
            agent.model = modelSlug;
          }
        }
      }
    }

    // Third pass: add tools to agents from tool tags
    for (const tag of this.tags) {
      if (tag[0] === "tool" && tag[1]) {
        const toolName = tag[1];
        // Elements 2+ are agent names that have this tool
        for (let i = 2; i < tag.length; i++) {
          const agentName = tag[i];
          const agent = agentMap.get(agentName);
          if (agent) {
            if (!agent.tools) agent.tools = [];
            agent.tools.push(toolName);
          }
        }
      }
    }

    return agents;
  }

  set agents(agentList: ProjectAgent[]) {
    // Remove existing agent, model, and tool tags
    this.tags = this.tags.filter(
      (tag) => tag[0] !== "agent" && tag[0] !== "model" && tag[0] !== "tool",
    );

    // Add agent tags
    for (const agent of agentList) {
      const tag = ["agent", agent.pubkey, agent.name];
      if (agent.isGlobal) tag.push("global");
      this.tags.push(tag);
    }

    // Build model -> agents mapping
    const modelMap = new Map<string, string[]>();
    for (const agent of agentList) {
      if (agent.model) {
        if (!modelMap.has(agent.model)) {
          modelMap.set(agent.model, []);
        }
        const modelAgents = modelMap.get(agent.model);
        if (modelAgents) {
          modelAgents.push(agent.name);
        }
      }
    }

    // Add model tags - simple format: ["model", "slug", ...agent-names]
    for (const [modelSlug, agentNames] of modelMap) {
      this.tags.push(["model", modelSlug, ...agentNames]);
    }

    // Build tool -> agents mapping
    const toolMap = new Map<string, string[]>();
    for (const agent of agentList) {
      if (agent.tools && agent.tools.length > 0) {
        for (const tool of agent.tools) {
          if (!toolMap.has(tool)) {
            toolMap.set(tool, []);
          }
          const toolAgents = toolMap.get(tool);
          if (toolAgents) {
            toolAgents.push(agent.name);
          }
        }
      }
    }

    // Add tool tags
    for (const [toolName, agentNames] of toolMap) {
      this.tags.push(["tool", toolName, ...agentNames]);
    }
  }

  get models(): ProjectModel[] {
    const models: ProjectModel[] = [];
    const modelSet = new Set<string>();

    for (const tag of this.tags) {
      if (tag[0] === "model" && tag[1]) {
        const modelSlug = tag[1];
        if (!modelSet.has(modelSlug)) {
          modelSet.add(modelSlug);
          models.push({
            provider: modelSlug, // Just use slug for both
            name: modelSlug,
          });
        }
      }
    }
    return models;
  }

  set models(modelList: ProjectModel[]) {
    // Remove existing model tags
    this.tags = this.tags.filter((tag) => tag[0] !== "model");

    // Add new model tags - simple format
    for (const model of modelList) {
      this.tags.push(["model", model.name]);
    }
  }

  get executionQueue(): ExecutionQueue {
    const queue: ExecutionQueue = {
      active: null,
      waiting: [],
      totalWaiting: 0,
    };

    const queueTags = this.tags.filter((tag) => tag[0] === "execution-queue");
    let waitingPosition = 1;

    for (const tag of queueTags) {
      if (tag[1]) {
        const conversationId = tag[1];
        const status = tag[2];

        if (status === "active") {
          // Active conversation with optional start time
          queue.active = {
            conversationId,
            startTime: tag[3] ? parseInt(tag[3]) : undefined,
          };
        } else {
          // Waiting conversation
          queue.waiting.push({
            conversationId,
            position: waitingPosition++,
          });
        }
      }
    }

    queue.totalWaiting = queue.waiting.length;
    return queue;
  }

  set executionQueue(queue: ExecutionQueue) {
    // Remove existing execution-queue tags
    this.tags = this.tags.filter((tag) => tag[0] !== "execution-queue");

    // Add active conversation if exists
    if (queue.active) {
      const tag: string[] = [
        "execution-queue",
        queue.active.conversationId,
        "active",
      ];
      if (queue.active.startTime) {
        tag.push(queue.active.startTime.toString());
      }
      this.tags.push(tag);
    }

    // Add waiting conversations
    for (const item of queue.waiting) {
      this.tags.push(["execution-queue", item.conversationId]);
    }
  }

  static from(event: NDKEvent): NDKProjectStatus {
    return new NDKProjectStatus(event.ndk, event.rawEvent());
  }
}
