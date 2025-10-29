# Co-Investment Stage-Wise Approval Flow Diagram

## 🔄 **Complete Co-Investment Approval Flow**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CO-INVESTMENT STAGE-WISE APPROVAL FLOW                    │
└─────────────────────────────────────────────────────────────────────────────┘

📝 LEAD INVESTOR CREATES CO-INVESTMENT OPPORTUNITY
    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STAGE 1                                        │
│                    Lead Investor Advisor Approval                           │
└─────────────────────────────────────────────────────────────────────────────┘
    ↓
    🔍 CHECK: Does Lead Investor have Advisor?
    ├─ YES → ⏳ WAIT for Lead Investor Advisor Approval
    │   ├─ ✅ APPROVE → Move to Stage 2
    │   └─ ❌ REJECT → Back to Stage 1 (Rejected)
    └─ NO → ⚡ AUTO-PROGRESS to Stage 2
    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STAGE 2                                        │
│                     Startup Advisor Approval                                │
└─────────────────────────────────────────────────────────────────────────────┘
    ↓
    🔍 CHECK: Does Startup have Advisor?
    ├─ YES → ⏳ WAIT for Startup Advisor Approval
    │   ├─ ✅ APPROVE → Move to Stage 3
    │   └─ ❌ REJECT → Back to Stage 2 (Rejected)
    └─ NO → ⚡ AUTO-PROGRESS to Stage 3
    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STAGE 3                                        │
│                      Ready for Startup Review                               │
└─────────────────────────────────────────────────────────────────────────────┘
    ↓
    ⏳ WAIT for Startup Approval
    ├─ ✅ APPROVE → Move to Stage 4 (ACTIVE)
    └─ ❌ REJECT → Back to Stage 3 (Rejected)
    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                              STAGE 4                                        │
│                        Co-Investment ACTIVE                                │
│              Other investors can now express interest                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            DASHBOARD VIEWS                                 │
└─────────────────────────────────────────────────────────────────────────────┘

👤 LEAD INVESTOR DASHBOARD:
    • Shows co-investment opportunities they created
    • Displays current stage and status
    • Tracks approval progress

👨‍💼 LEAD INVESTOR ADVISOR DASHBOARD:
    • Shows opportunities at Stage 1
    • Can approve/reject opportunities
    • Approvals move to Stage 2

👩‍💼 STARTUP ADVISOR DASHBOARD:
    • Shows opportunities at Stage 2
    • Can approve/reject opportunities
    • Approvals move to Stage 3

🏢 STARTUP DASHBOARD:
    • Shows opportunities at Stage 3
    • Can approve/reject opportunities
    • Approvals move to Stage 4 (ACTIVE)

┌─────────────────────────────────────────────────────────────────────────────┐
│                            SCENARIO EXAMPLES                                │
└─────────────────────────────────────────────────────────────────────────────┘

SCENARIO 1: Both have Advisors (Full Flow)
Lead Investor → Stage 1 → Lead Advisor → Stage 2 → Startup Advisor → Stage 3 → Startup → Stage 4

SCENARIO 2: Lead Investor has Advisor, Startup doesn't
Lead Investor → Stage 1 → Lead Advisor → Stage 2 → ⚡ AUTO → Stage 3 → Startup → Stage 4

SCENARIO 3: Lead Investor doesn't have Advisor, Startup has Advisor
Lead Investor → Stage 1 → ⚡ AUTO → Stage 2 → Startup Advisor → Stage 3 → Startup → Stage 4

SCENARIO 4: Neither has Advisors (Fastest)
Lead Investor → Stage 1 → ⚡ AUTO → Stage 2 → ⚡ AUTO → Stage 3 → Startup → Stage 4

┌─────────────────────────────────────────────────────────────────────────────┐
│                            DATABASE FUNCTIONS                               │
└─────────────────────────────────────────────────────────────────────────────┘

• update_co_investment_opportunity_stage(opportunity_id, new_stage)
• approve_lead_investor_advisor_co_investment(opportunity_id, action)
• approve_startup_advisor_co_investment(opportunity_id, action)
• approve_startup_co_investment(opportunity_id, action)
• handle_co_investment_flow(opportunity_id)

┌─────────────────────────────────────────────────────────────────────────────┐
│                            STAGE STATUS DISPLAY                            │
└─────────────────────────────────────────────────────────────────────────────┘

🔵 Stage 1: Lead Investor Advisor Approval
🟣 Stage 2: Startup Advisor Approval  
✅ Stage 3: Ready for Startup Review
🎉 Stage 4: Approved (ACTIVE)

┌─────────────────────────────────────────────────────────────────────────────┐
│                            INTEGRATION POINTS                               │
└─────────────────────────────────────────────────────────────────────────────┘

• Same stage numbers as regular investment offers (1, 2, 3, 4)
• Same approval logic and auto-progression rules
• Same UI patterns and status displays
• Same database structure and constraints
• Seamless integration with existing advisor system




