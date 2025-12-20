# Run All 22 Migration Scripts - Complete Guide

## ✅ Phase 1: Already Completed (7 scripts)
These were already run successfully - no action needed.

---

## 🚀 Phase 2: Run These 15 Scripts (In Order)

Run these scripts one by one in Supabase SQL Editor. Test after each migration.

### **High Priority Functions (6 scripts):**

#### 1. `MIGRATE_SET_ADVISOR_OFFER_VISIBILITY_FUNCTION.sql`
- **Function:** `set_advisor_offer_visibility`
- **What it does:** Sets visibility for investment advisors on offers
- **Test:** Verify advisor offer visibility works correctly

---

#### 2. `MIGRATE_GET_DUE_DILIGENCE_REQUESTS_FOR_STARTUP_FUNCTION.sql`
- **Function:** `get_due_diligence_requests_for_startup`
- **What it does:** Returns due diligence requests for a startup
- **Test:** Check if due diligence requests display correctly

---

#### 3. `MIGRATE_GET_INVESTOR_RECOMMENDATIONS_FUNCTION.sql`
- **Function:** `get_investor_recommendations`
- **What it does:** Returns investment recommendations for an investor
- **Test:** Verify investor recommendations display correctly

---

#### 4. `MIGRATE_GET_INVESTMENT_ADVISOR_INVESTORS_FUNCTION.sql`
- **Function:** `get_investment_advisor_investors`
- **What it does:** Returns all investors for an investment advisor
- **Test:** Check if advisor dashboard shows investors correctly

---

#### 5. `MIGRATE_GET_INVESTMENT_ADVISOR_STARTUPS_FUNCTION.sql`
- **Function:** `get_investment_advisor_startups`
- **What it does:** Returns all startups for an investment advisor
- **Test:** Check if advisor dashboard shows startups correctly

---

#### 6. `MIGRATE_GET_USER_PROFILE_FUNCTION.sql`
- **Function:** `get_user_profile`
- **What it does:** Returns user profile data
- **Test:** Verify user profile retrieval works correctly

---

### **Code Generation Functions (8 scripts):**

#### 7. `MIGRATE_ASSIGN_FACILITATOR_CODE_FUNCTION.sql`
- **Function:** `assign_facilitator_code`
- **What it does:** Assigns a facilitator code to a user
- **Test:** Try assigning a facilitator code

---

#### 8. `MIGRATE_ASSIGN_MENTOR_CODE_FUNCTION.sql`
- **Function:** `assign_mentor_code`
- **What it does:** Assigns a mentor code to a user
- **Test:** Try assigning a mentor code

---

#### 9. `MIGRATE_GENERATE_CA_CODE_FUNCTION.sql`
- **Function:** `generate_ca_code`
- **What it does:** Generates a unique CA (Chartered Accountant) code
- **Test:** Try generating a CA code

---

#### 10. `MIGRATE_GENERATE_CS_CODE_FUNCTION.sql`
- **Function:** `generate_cs_code`
- **What it does:** Generates a unique CS (Company Secretary) code
- **Test:** Try generating a CS code

---

#### 11. `MIGRATE_GENERATE_FACILITATOR_CODE_FUNCTION.sql`
- **Function:** `generate_facilitator_code`
- **What it does:** Generates a unique facilitator code
- **Test:** Try generating a facilitator code

---

#### 12. `MIGRATE_GENERATE_INVESTMENT_ADVISOR_CODE_FUNCTION.sql`
- **Function:** `generate_investment_advisor_code`
- **What it does:** Generates a unique investment advisor code
- **Test:** Try generating an investment advisor code

---

#### 13. `MIGRATE_GENERATE_INVESTOR_CODE_FUNCTION.sql`
- **Function:** `generate_investor_code` (TRIGGER FUNCTION)
- **What it does:** Auto-generates investor code on profile creation
- **Test:** Create a new investor profile and verify code is generated

---

#### 14. `MIGRATE_GENERATE_MENTOR_CODE_FUNCTION.sql`
- **Function:** `generate_mentor_code`
- **What it does:** Generates a unique mentor code
- **Test:** Try generating a mentor code

---

### **Utility Functions (7 scripts):**

#### 15. `MIGRATE_GET_FACILITATOR_BY_CODE_FUNCTION.sql`
- **Function:** `get_facilitator_by_code`
- **What it does:** Returns facilitator user ID by code
- **Test:** Try looking up a facilitator by code

---

#### 16. `MIGRATE_GET_FACILITATOR_CODE_FUNCTION.sql`
- **Function:** `get_facilitator_code`
- **What it does:** Returns facilitator code for a user
- **Test:** Try getting facilitator code for a user

---

#### 17. `MIGRATE_GET_APPLICATIONS_WITH_CODES_FUNCTION.sql`
- **Function:** `get_applications_with_codes`
- **What it does:** Returns opportunity applications with facilitator codes
- **Test:** Check if applications display with facilitator info

---

#### 18. `MIGRATE_GET_OPPORTUNITIES_WITH_CODES_FUNCTION.sql`
- **Function:** `get_opportunities_with_codes`
- **What it does:** Returns incubation opportunities with facilitator codes
- **Test:** Check if opportunities display with facilitator info

---

#### 19. `MIGRATE_SAFE_DELETE_STARTUP_USER_FUNCTION.sql`
- **Function:** `safe_delete_startup_user`
- **What it does:** Safely deletes a startup user and their startups
- **Test:** ⚠️ Be careful - test with a test user only

---

#### 20. `MIGRATE_SET_FACILITATOR_CODE_ON_OPPORTUNITY_FUNCTION.sql`
- **Function:** `set_facilitator_code_on_opportunity` (TRIGGER FUNCTION)
- **What it does:** Auto-sets facilitator code on opportunity creation
- **Test:** Create a new opportunity and verify code is set

---

#### 21. `MIGRATE_UPDATE_INVESTMENT_ADVISOR_RELATIONSHIP_FUNCTION.sql`
- **Function:** `update_investment_advisor_relationship` (TRIGGER FUNCTION)
- **What it does:** Auto-creates advisor relationships when investor enters code
- **Test:** Enter an advisor code as an investor and verify relationship is created

---

#### 22. `MIGRATE_UPDATE_STARTUP_INVESTMENT_ADVISOR_RELATIONSHIP_FUNCTION.sql`
- **Function:** `update_startup_investment_advisor_relationship` (TRIGGER FUNCTION)
- **What it does:** Auto-creates advisor relationships when startup has advisor code
- **Test:** Set advisor code on a startup and verify relationship is created

---

## 📋 Execution Checklist

- [ ] Script 1: set_advisor_offer_visibility
- [ ] Script 2: get_due_diligence_requests_for_startup
- [ ] Script 3: get_investor_recommendations
- [ ] Script 4: get_investment_advisor_investors
- [ ] Script 5: get_investment_advisor_startups
- [ ] Script 6: get_user_profile
- [ ] Script 7: assign_facilitator_code
- [ ] Script 8: assign_mentor_code
- [ ] Script 9: generate_ca_code
- [ ] Script 10: generate_cs_code
- [ ] Script 11: generate_facilitator_code
- [ ] Script 12: generate_investment_advisor_code
- [ ] Script 13: generate_investor_code
- [ ] Script 14: generate_mentor_code
- [ ] Script 15: get_facilitator_by_code
- [ ] Script 16: get_facilitator_code
- [ ] Script 17: get_applications_with_codes
- [ ] Script 18: get_opportunities_with_codes
- [ ] Script 19: safe_delete_startup_user
- [ ] Script 20: set_facilitator_code_on_opportunity
- [ ] Script 21: update_investment_advisor_relationship
- [ ] Script 22: update_startup_investment_advisor_relationship

---

## 🎯 After Running All Scripts

**Result:** 29 functions migrated ✅
- 7 functions (Phase 1 - already done)
- 22 functions (Phase 2 - just completed)

**Next:** Check remaining functions if needed

---

## ✅ All Scripts Are Safe

- ✅ Function signatures unchanged
- ✅ No frontend changes needed
- ✅ No fallback logic (optimized)
- ✅ All users have profiles (verified)

**Ready to run!** 🚀



