# SophiaClaw: Governance for OpenClaw

## Vision

SophiaClaw brings Sophia's three-layer governance architecture to OpenClaw, transforming it from a personal AI assistant into a **governed multi-agent execution platform**. While OpenClaw provides the "channels and tools," SophiaClaw provides the "accountability and guardrails."

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SOPHIA CLAW ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  LAYER 1: COGNEXA (System of Thought)                              │   │
│  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────────────────┐ │   │
│  │  │  Intent │ → │  Gate   │ → │ Contract│ → │  Execution Plan     │ │   │
│  │  │Capture  │   │Check    │   │Define   │   │  (OpenClaw Skills)  │ │   │
│  │  └─────────┘   └─────────┘   └─────────┘   └─────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │ governs                               │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐   │
│  │  LAYER 2: SOPHIA CLAW (Governance Authority)                         │   │
│  │                                                                      │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │   │   Policy    │  │   Session   │  │   Bulletin  │  │  Skills   │  │   │
│  │   │   Engine    │  │   Manager   │  │   System    │  │  Registry │  │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │   │
│  │                                                                      │   │
│  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐  │   │
│  │   │   Memory    │  │   Claims    │  │  Approval   │  │  Token    │  │   │
│  │   │   System    │  │   (Files)   │  │   Router    │  │  Tracker  │  │   │
│  │   └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │ authorizes                            │
│  ┌─────────────────────────────────▼─────────────────────────────────────┐   │
│  │  LAYER 3: OPENCLAW EXECUTION (The Labor)                             │   │
│  │                                                                      │   │
│  │   WhatsApp  Telegram   Slack   Discord   iMessage   WebChat         │   │
│  │       │        │         │        │         │         │              │   │
│  │       └────────┴─────────┴────────┴─────────┴─────────┘              │   │
│  │                              │                                       │   │
│  │                    ┌─────────▼──────────┐                            │   │
│  │                    │  OpenClaw Gateway  │                            │   │
│  │                    │  (ws://localhost)  │                            │   │
│  │                    └─────────┬──────────┘                            │   │
│  │                              │                                       │   │
│  │         ┌────────────────────┼────────────────────┐                  │   │
│  │         ▼                    ▼                    ▼                  │   │
│  │   ┌──────────┐        ┌──────────┐        ┌──────────┐              │   │
│  │   │  Pi Agent│        │  Nodes   │        │  Skills  │              │   │
│  │   │  (Core)  │        │(Devices) │        │(Plugins) │              │   │
│  │   └──────────┘        └──────────┘        └──────────┘              │   │
│  │                                                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Concept: The "Governed Gateway"

OpenClaw's Gateway becomes a **governed control plane** where:

1. **Every message flows through Sophia gates** before reaching the Pi agent
2. **Every skill execution is a contracted action** with pre/post checks
3. **Every session is tracked** with intent, claims, and audit trail
4. **Multi-channel becomes multi-agent coordination** via the bulletin system

## Key Integration Points

### 1. SophiaClaw Skill (Primary Interface)

A native OpenClaw skill that embeds the entire governance layer:

```yaml
# ~/.openclaw/workspace/skills/sophia-claw/SKILL.md
name: sophia-claw
description: |
  Governance and accountability layer for OpenClaw.
  All actions flow through Sophia gates before execution.
  Provides session management, policy enforcement, and audit trails.

tools:
  # Intent Capture
  - sophia_intent_create:
      description: "Start a governed work session with explicit intent"
      params:
        intent: "What we aim to accomplish"
        scope: "Files/channels affected"
        risk_level: "low|medium|high|critical"

  # Gate Checking
  - sophia_gate_check:
      description: "Verify action against policies before execution"
      params:
        action_type: "file_write|shell_exec|api_call|skill_invoke"
        target: "What is being acted upon"
        content_hash: "Hash of proposed changes"

  # Contract Management
  - sophia_contract_create:
      description: "Define success criteria for an action"
      params:
        deliverables: "What will be produced"
        verification: "How success is measured"
        rollback_plan: "How to undo if needed"

  # Session/Claims
  - sophia_session_claim:
      description: "Claim files/channels for exclusive access"
      params:
        pattern: "Glob pattern for resources"
        mode: "soft|hard"

  # Bulletin
  - sophia_bulletin_post:
      description: "Log activity to the audit trail"
      params:
        type: "decision|action|conflict|escalation"
        message: "Human-readable description"
        metadata: "Structured data"

  # Memory
  - sophia_memory_record:
      description: "Record patterns, corrections, or decisions"
      params:
        type: "pattern|correction|decision"
        content: "What was learned"
        keywords: "For retrieval"

gates:
  # All skill invocations pass through these gates
  pre_execution:
    - policy_check: "Run security/quality policies"
    - claim_verify: "Ensure no conflicting claims"
    - budget_check: "Verify token budget available"

  post_execution:
    - verification: "Check against contract criteria"
    - bulletin_log: "Record outcome"
    - memory_update: "Update pattern effectiveness"
```

### 2. Gateway Middleware (Control Plane Integration)

Intercept all Gateway traffic for governance:

```typescript
// ~/.openclaw/gateway/middleware/sophia-governance.ts
import { GatewayMiddleware } from '@openclaw/gateway';
import { SophiaGovernor } from 'sophia-claw';

export const sophiaGovernance: GatewayMiddleware = {
  name: 'sophia-governance',
  priority: 'highest', // Run before all other middleware

  async onMessage(context) {
    const { message, channel, sender, session } = context;

    // 1. Intent Capture (if new session)
    if (!session.hasActiveIntent()) {
      const intent = await extractIntent(message);
      const gateResult = await sophia.gate.check({
        intent,
        channel,
        sender_policy: sender.dmPolicy,
      });

      if (!gateResult.approved) {
        return {
          action: 'block',
          reason: gateResult.reason,
          escalation: gateResult.requiresHumanApproval,
        };
      }

      await sophia.session.start({
        intent,
        channel_id: channel.id,
        sender_id: sender.id,
        approved_by: gateResult.approver,
      });
    }

    // 2. Pre-execution Gate (for tool calls)
    if (message.hasToolCalls()) {
      for (const toolCall of message.toolCalls) {
        const contract = await sophia.contract.create({
          tool: toolCall.name,
          params: toolCall.params,
          expected_outcome: toolCall.expectedOutcome,
        });

        const check = await sophia.gate.check({
          action_type: mapToolToActionType(toolCall.name),
          contract,
          session_context: session.getContext(),
        });

        if (!check.approved) {
          await sophia.bulletin.post({
            type: 'blocked_action',
            session: session.id,
            tool: toolCall.name,
            reason: check.reason,
          });

          return {
            action: 'block_tool',
            tool: toolCall.name,
            reason: check.reason,
          };
        }

        // Attach contract for post-execution verification
        toolCall.sophiaContract = contract;
      }
    }

    return { action: 'continue' };
  },

  async onResponse(context) {
    const { response, toolCalls, session } = context;

    // Post-execution verification
    for (const toolCall of toolCalls) {
      if (toolCall.sophiaContract) {
        const verification = await sophia.contract.verify({
          contract: toolCall.sophiaContract,
          actual_outcome: response,
        });

        await sophia.bulletin.post({
          type: 'action_completed',
          session: session.id,
          tool: toolCall.name,
          contract_fulfilled: verification.fulfilled,
          variance: verification.variance,
        });

        // Update memory with effectiveness
        if (verification.fulfilled) {
          await sophia.memory.reinforcePattern({
            pattern: toolCall.name,
            context: session.intent,
          });
        } else {
          await sophia.memory.recordCorrection({
            pattern: toolCall.name,
            expected: toolCall.sophiaContract.expected_outcome,
            actual: verification.actual,
          });
        }
      }
    }

    return { action: 'continue' };
  },
};
```

### 3. Multi-Channel as Multi-Agent

OpenClaw's multi-channel support becomes a **distributed agent coordination** system:

```
WhatsApp (User A) ──┐
                    │
Telegram (User B) ──┼──► SophiaClaw Bulletin ──► Coordination
                    │         (Shared State)
Slack (Team) ───────┤
                    │
Discord (Community)─┘
```

Each channel can have:
- **Independent sessions** with their own intents and claims
- **Shared governance state** via the bulletin
- **Cross-channel awareness** (e.g., "User B is modifying the same file")

```typescript
// Cross-channel conflict detection
async function checkCrossChannelConflicts(channelId: string, action: Action) {
  const activeSessions = await sophia.session.listActive();

  for (const session of activeSessions) {
    if (session.channel_id === channelId) continue;

    const conflicts = await sophia.claims.checkConflict({
      session: session.id,
      action,
    });

    if (conflicts.length > 0) {
      await sophia.bulletin.post({
        type: 'cross_channel_conflict',
        channels: [channelId, session.channel_id],
        conflicts,
        resolution_required: true,
      });

      // Notify both channels
      await gateway.sendToChannel(session.channel_id, {
        text: `⚠️ Cross-channel conflict detected: ${conflicts[0].description}`,
      });

      return { blocked: true, reason: 'cross_channel_conflict' };
    }
  }
}
```

### 4. Voice/Talk Mode Governance

Special handling for voice interactions (always-on, streaming):

```typescript
// Voice session with continuous governance
interface VoiceGovernanceSession {
  session_id: string;
  wake_word_context: string; // What was happening when wake word detected
  intent_buffer: string[]; // Accumulated intent from conversation
  provisional_claims: Claim[]; // Claims held during conversation
  escalation_ready: boolean; // Ready to escalate if needed
}

// Voice-specific gates
const voiceGates = {
  // Lower threshold for destructive actions in voice mode
  async preExecution(action: Action, session: VoiceGovernanceSession) {
    if (action.destructive && !session.escalation_ready) {
      // Require explicit confirmation for destructive actions
      return {
        approved: false,
        requires_confirmation: true,
        confirmation_phrase: `Confirm: ${action.description}`,
      };
    }

    // Streaming policy check (fast, partial)
    const streamingCheck = await sophia.gate.streamingCheck(action);
    return streamingCheck;
  },

  // Post-utterance verification
  async postUtterance(utterance: string, session: VoiceGovernanceSession) {
    // Update intent buffer
    session.intent_buffer.push(utterance);

    // Check if we have enough context for a complete intent
    const extractedIntent = await sophia.intent.extract(
      session.intent_buffer.join(' ')
    );

    if (extractedIntent.complete) {
      // Formalize the session
      await sophia.session.formalize({
        session_id: session.session_id,
        intent: extractedIntent,
      });
    }
  },
};
```

### 5. Canvas/Visual Mode Governance

The A2UI visual workspace gets governance for visual actions:

```typescript
// Canvas action governance
interface CanvasGovernance {
  // Visual elements are "claimed" like files
  async claimCanvasRegion(sessionId: string, region: BoundingBox) {
    return await sophia.claims.create({
      type: 'canvas_region',
      session: sessionId,
      bounds: region,
      mode: 'hard', // Visual conflicts are immediate
    });
  }

  // Check before rendering/modifying visual elements
  async checkVisualAction(action: VisualAction) {
    // Policy: Certain visualizations require approval
    if (action.type === 'external_image' || action.type === 'iframe') {
      return await sophia.gate.check({
        action_type: 'external_content',
        security_risk: 'xss_potential',
      });
    }

    // Check for visual conflicts (overlapping claims)
    const conflicts = await sophia.claims.checkVisualConflicts(action.region);
    if (conflicts.length > 0) {
      return {
        approved: false,
        reason: 'visual_conflict',
        conflicts,
      };
    }
  }
}
```

## Configuration Schema

```json
// ~/.openclaw/openclaw.json with SophiaClaw
{
  "agent": {
    "model": "anthropic/claude-opus-4-6"
  },
  "sophia": {
    "enabled": true,
    "governance_level": "enterprise", // community | startup | enterprise
    "strictness": "strict", // permissive | moderate | strict

    "channels": {
      "whatsapp": { "governance": "full", "dm_policy": "pairing" },
      "telegram": { "governance": "full", "dm_policy": "pairing" },
      "slack": { "governance": "full", "channel_approval": true },
      "discord": { "governance": "standard" },
      "webchat": { "governance": "minimal" }
    },

    "voice": {
      "enabled": true,
      "destructive_confirmation": true,
      "session_timeout_seconds": 300
    },

    "canvas": {
      "enabled": true,
      "external_content_policy": "block",
      "visual_claims": true
    },

    "skills": {
      "install_gating": true, // Require approval for new skills
      "auto_update_policy": "notify", // notify | auto | block
      "trusted_registries": ["clawhub.com", "internal.corp"]
    },

    "policies": {
      "enabled": [
        "security",
        "quality",
        "cost",
        "privacy"
      ],
      "custom_policies_dir": "~/.openclaw/sophia/policies"
    },

    "bulletin": {
      "retention_days": 90,
      "export_to": ["slack_audit_channel", "file"]
    },

    "escalation": {
      "channels": ["slack", "email"],
      "urgency_levels": {
        "high": { "notify_within_seconds": 60 },
        "critical": { "notify_within_seconds": 10, "page": true }
      }
    }
  }
}
```

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
- [ ] Create `sophia-claw` skill structure
- [ ] Implement basic session tracking
- [ ] Add policy engine integration
- [ ] Create bulletin logging

### Phase 2: Gateway Integration (Weeks 3-4)
- [ ] Build Gateway middleware
- [ ] Implement pre/post execution gates
- [ ] Add cross-channel conflict detection
- [ ] Create escalation routing

### Phase 3: Advanced Features (Weeks 5-6)
- [ ] Voice mode governance
- [ ] Canvas visual claims
- [ ] Skills install gating
- [ ] Token/cost tracking

### Phase 4: Dashboard & Monitoring (Weeks 7-8)
- [ ] SophiaClaw dashboard (extends OpenClaw UI)
- [ ] Cross-channel activity view
- [ ] Policy violation reports
- [ ] Memory management interface

## Differentiation from Base OpenClaw

| Feature | OpenClaw | SophiaClaw |
|---------|----------|------------|
| **Intent** | Implicit from conversation | Explicit, captured and stored |
| **Sessions** | Technical (WebSocket) | Governed with accountability |
| **File Access** | Direct via tools | Claim-based with conflict detection |
| **Multi-Channel** | Independent channels | Coordinated via bulletin |
| **Skills** | Install and run | Gated installation, contracted execution |
| **Voice** | Always-on execution | Governed with confirmation for risky actions |
| **Canvas** | Free-form visual | Claim-based regions with policy checks |
| **Audit** | Session logs | Immutable bulletin with verification |
| **Memory** | Context window | Persistent patterns, corrections, decisions |
| **Approvals** | None | Configurable escalation paths |

## Open Questions

1. **Performance**: Can governance gates run fast enough for real-time voice?
2. **Storage**: Where does the SQLite database live for multi-device sync?
3. **Identity**: How do we map OpenClaw's sender IDs to Sophia's agent model?
4. **Offline**: How does governance work when devices are offline?
5. **Migration**: How do existing OpenClaw users adopt SophiaClaw?

## Next Steps

1. Create a proof-of-concept skill that adds basic session tracking
2. Build the Gateway middleware with logging only (no blocking)
3. Design the cross-channel bulletin sync protocol
4. Prototype voice mode with confirmation for destructive actions
