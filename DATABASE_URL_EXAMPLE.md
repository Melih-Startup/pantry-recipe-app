# DATABASE_URL - Name vs Value Explained

## Simple Explanation

When you set an environment variable, you have **two parts**:

1. **NAME** (the key) = `DATABASE_URL`
2. **VALUE** (what it contains) = Your connection string

## Visual Example

In Vercel's environment variables form, it looks like this:

```
┌─────────────────────────────────────────────────────────┐
│ Key (Name)                                              │
│ ┌──────────────────────────────────────────────────┐   │
│ │ DATABASE_URL                                     │   │ ← THIS IS THE NAME
│ └──────────────────────────────────────────────────┘   │
│                                                          │
│ Value                                                   │
│ ┌──────────────────────────────────────────────────┐   │
│ │ postgresql://postgres:5TB$9VvtWJD%tXD@          │   │
│ │ db.xckyjiuplffowkqybqdh.supabase.co:5432/postgres│   │ ← THIS IS THE VALUE
│ └──────────────────────────────────────────────────┘   │
│                                                          │
│ Environment                                             │
│ ☑ Production                                            │
│ ☑ Preview                                               │
│ ☑ Development                                           │
│                                                          │
│ [Cancel]  [Save]                                        │
└─────────────────────────────────────────────────────────┘
```

## Your Specific Example

**Variable Name (Key):**
```
DATABASE_URL
```

**Variable Value:**
```
postgresql://postgres:5TB$9VvtWJD%tXD@db.xckyjiuplffowkqybqdh.supabase.co:5432/postgres
```

## How to Add It in Vercel

1. Go to Vercel → Your Project → Settings → Environment Variables
2. Click **"Add"** or **"Add New"**
3. In the **"Key"** or **"Name"** field, type:
   ```
   DATABASE_URL
   ```
4. In the **"Value"** field, paste:
   ```
   postgresql://postgres:5TB$9VvtWJD%tXD@db.xckyjiuplffowkqybqdh.supabase.co:5432/postgres
   ```
5. Check all three environments (Production, Preview, Development)
6. Click **Save**

## Why It's Confusing

- `DATABASE_URL` = Just a name/label (like a variable name in code)
- The connection string = The actual data/value

Think of it like:
- **Name tag**: "My Name"
- **Value**: "John Doe"

Both together: "My Name" = "John Doe"

Same here:
- **Variable Name**: `DATABASE_URL`
- **Variable Value**: `postgresql://postgres:5TB$9VvtWJD%tXD@db.xckyjiuplffowkqybqdh.supabase.co:5432/postgres`

## Your Connection String Looks Good! ✅

The connection string you have:
```
postgresql://postgres:5TB$9VvtWJD%tXD@db.xckyjiuplffowkqybqdh.supabase.co:5432/postgres
```

This is perfect! Just paste it as the **value** when creating the `DATABASE_URL` environment variable.




