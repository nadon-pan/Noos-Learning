# lib/

Utility files and third-party client setup.

## Files

- `supabase.js` — Supabase client instance (import this wherever you need DB/auth access)

## Usage

```js
import supabase from '@/lib/supabase';

// Auth example
const { data, error } = await supabase.auth.signInWithPassword({ email, password });

// DB example (future)
const { data } = await supabase.from('scores').select('*');
```
