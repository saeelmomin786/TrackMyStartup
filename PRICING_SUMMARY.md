# Pricing Summary - Global Plans (EUR)

## 💰 Subscription Plan Pricing

### **Free Plan**
- **Price**: €0/month
- **Currency**: EUR
- **Storage**: 100 MB
- **Target**: Global users

### **Basic Plan**
- **Price**: €5/month
- **Currency**: EUR
- **Storage**: 1 GB
- **Target**: Global users

### **Premium Plan**
- **Price**: €20/month
- **Currency**: EUR
- **Storage**: 10 GB
- **Target**: Global users

---

## 🌍 Payment Gateway Routing

### **For Indian Users**
- **Gateway**: Razorpay
- **Currency**: INR (Razorpay will handle conversion from EUR if needed)
- **Plans**: Same EUR pricing, converted to INR at checkout

### **For International Users**
- **Gateway**: PayAid
- **Currency**: EUR
- **Plans**: Direct EUR pricing

---

## 📊 Feature Comparison

| Feature | Free (€0) | Basic (€5) | Premium (€20) |
|---------|-----------|------------|---------------|
| Dashboard Access | ✅ | ✅ | ✅ |
| Financial Tracking | ✅ | ✅ | ✅ |
| Compliance Management | ✅ | ✅ | ✅ |
| Profile Management | ✅ | ✅ | ✅ |
| Portfolio Fundraising | ❌ | ✅ | ✅ |
| Grants Draft + CRM | ❌ | ✅ | ✅ |
| AI Investor Matching | ❌ | ✅ | ✅ |
| CRM Access | ❌ | ✅ | ✅ |
| Active Fundraising | ❌ | ❌ | ✅ |
| Storage | 100 MB | 1 GB | 10 GB |

---

## 🔄 Currency Handling

### **Database Storage**
- All plans stored with EUR pricing in `subscription_plans` table
- `currency` column set to 'EUR' for global plans
- `country` column set to 'Global' for international plans

### **Payment Processing**
- **Razorpay (India)**: 
  - Accepts EUR pricing
  - May convert to INR at gateway level if needed
  - User sees EUR amount, gateway handles conversion
  
- **PayAid (International)**:
  - Direct EUR processing
  - No conversion needed

---

## 📝 Implementation Notes

1. **Plan Creation**: Use `CREATE_SUBSCRIPTION_PLANS_EUR.sql` to create plans
2. **Currency Display**: Frontend should display EUR symbol (€) for all global plans
3. **Gateway Selection**: Based on user country, not currency
4. **Price Consistency**: All global plans use EUR, regardless of payment gateway

---

**Last Updated**: [Current Date]  
**Status**: Ready for Implementation
