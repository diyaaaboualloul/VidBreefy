# Tooltip Guide — Where to Add Explanations

## Rule: Every button or config field that needs external setup = tooltip

---

## 🟣 SummarizePage (/summarize)

| Element | Tooltip Message |
|---------|----------------|
| Summarize Button | "Requires GROQ_API_KEY in backend .env file. Get free key at console.groq.com" |
| Format Toggle | "TL;DR = 1-2 sentences, Short = paragraph, Detailed = sections with timestamps" |
| Pro Badge | "Upgrade to Pro for unlimited summaries and no ads" |

---

## 🟣 AI Models Page (/admin/ai-models)

| Element | Tooltip Message |
|---------|----------------|
| API Key Input | "Get your API key from the provider's console. Key is stored encrypted." |
| Enable/Disable Toggle | "Disabled models won't appear in user model selector" |
| Set as Default | "This model will be used for all Free tier users by default" |
| Test Connection Button | "Click to verify the API key works and model is accessible" |

---

## 🟣 Settings Page (/admin/settings)

| Element | Tooltip Message |
|---------|----------------|
| Groq API Key | "Get free key at console.groq.com — used for AI summaries by default" |
| YouTube API Key | "Fallback for transcript extraction. Get at console.cloud.google.com" |
| Paddle Vendor ID | "Found in Paddle dashboard → Authentication → API Keys" |
| Paddle Webhook Key | "Found in Paddle dashboard → Notifications → Webhooks" |
| AdSense Publisher ID | "Get from google.com/adsense after approval (takes 1-2 weeks)" |

---

## 🟣 Pricing Page (/admin/pricing)

| Element | Tooltip Message |
|---------|----------------|
| Pro Price Input | "Monthly price in USD. $7 = recommended starting price" |
| Currency | "Currently only USD supported" |

---

## 🟣 Dashboard - Model Selector (Pro users)

| Element | Tooltip Message |
|---------|----------------|
| Model Dropdown | "Select your preferred AI model. Different models = different summary styles" |
| Pro Badge | "Unlimited summaries — no daily limit" |

---

## 🟣 Landing Page - Pricing Section

| Element | Tooltip Message |
|---------|----------------|
| Free Plan | "3 summaries per day, AdSense ads shown, Groq model only" |
| Pro Plan | "$7/month — unlimited, no ads, all AI models" |
| Ad Badge (Free) | "Free tier shows Google ads to support the service" |

---

## 🟣 Admin Users Page

| Element | Tooltip Message |
|---------|----------------|
| Ban Button | "User cannot login after ban. Data is preserved." |
| Delete Button | "Soft delete — data kept 30 days before permanent deletion" |
| Upgrade to Pro | "Manually grant Pro access (no Paddle charge)" |

---

## Component Usage

```jsx
import Tooltip, { FormField, ButtonTooltip, StatusBadge } from './components/Tooltip';

// Button with warning tooltip
<ButtonTooltip configNeeded>
  <button>Summarize</button>
</ButtonTooltip>

// Form field with hint tooltip
<FormField label="API Key" hint="Get your key from console.groq.com">
  <input placeholder="gsk_..." />
</FormField>

// Status badge
<StatusBadge status="warning" label="Needs Config" />
```

---

## Tooltip Types

| Type | Color | Use When |
|------|-------|----------|
| info (blue) | Blue | General info, how-to |
| warning (orange) | Orange | Needs attention, not configured |
| danger (red) | Red | Critical, broken, action required |