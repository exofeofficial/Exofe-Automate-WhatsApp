# API Contract

This file lists every backend endpoint the frontend already expects. All the fetch calls live in one place: `src/lib/api.ts`. If you change a URL or a response shape, that is the only file that needs to change on the frontend side.

## Base URL

The frontend reads the API URL from an environment variable.

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Set this in `.env.local` (see `.env.example`). Every request below is made relative to this base URL.

## How requests and errors work

Every request sends `Content-Type: application/json` and a JSON body.

On success, the response should be JSON matching what is listed under each endpoint.

On failure, the response should be JSON shaped like this:

```json
{
  "message": "Something went wrong",
  "errors": {
    "email": "This email is already in use"
  }
}
```

`message` is required. `errors` is optional and only needed for form validation failures (see the signup endpoint below). If a request fails and there is no JSON body at all, the frontend just falls back to showing the HTTP status text, so a plain error status still works, it just won't be as specific.

## Endpoints

### 1. Join waitlist

Used by the email box in the homepage CTA section.

```
POST /waitlist
```

Request body:

```json
{ "email": "shopowner@example.com" }
```

Success response (200):

```json
{ "message": "You're on the list" }
```

### 2. Sign up

Used on the `/signup` page.

```
POST /auth/signup
```

Request body:

```json
{
  "firstName": "Umer",
  "lastName": "Akhlaq",
  "email": "umer@example.com",
  "password": "somepassword123",
  "countryCode": "PK",
  "phone": "3227831753",
  "hearAbout": "Google Search"
}
```

`countryCode` is always one of `"PK"`, `"KR"`, or `"AE"` since those are the only markets we support right now. `phone` is sent as digits only, without the country dial code (the frontend strips that out before sending).

Success response (201):

```json
{ "token": "jwt-or-session-token-here" }
```

Validation failure (422): use this when specific fields are wrong, like a duplicate email or a weak password. The frontend will show each message right under the matching field.

```json
{
  "message": "Please fix the errors below",
  "errors": {
    "email": "This email is already registered"
  }
}
```

### 3. Log in

Used on the `/login` page.

```
POST /auth/login
```

Request body:

```json
{ "email": "umer@example.com", "password": "somepassword123" }
```

Success response (200):

```json
{ "token": "jwt-or-session-token-here" }
```

Wrong email or password should come back as a plain 401 with a message, no need for the `errors` field here:

```json
{ "message": "Incorrect email or password" }
```

### 4. Request an OTP code

Used by the "Login with OTP" flow on the `/login` page. This is step one of two.

```
POST /auth/otp/request
```

Request body:

```json
{ "email": "umer@example.com" }
```

Success response (200):

```json
{ "message": "Code sent" }
```

This is where you'd actually send the email or SMS with the code.

### 5. Verify an OTP code

Step two of the OTP login flow, called after the user types in the code they received.

```
POST /auth/otp/verify
```

Request body:

```json
{ "email": "umer@example.com", "code": "123456" }
```

Success response (200):

```json
{ "token": "jwt-or-session-token-here" }
```

If the code is wrong or expired, send back a 401 or 400 with a message, same shape as the login error above.

### 6. Book a demo

Used on the `/demo` page. This does not create an account, it is just a lead for the sales team to follow up on.

```
POST /demo/book
```

Request body:

```json
{
  "name": "Umer Akhlaq",
  "email": "umer@example.com",
  "billingCountry": "Pakistan",
  "countryCode": "PK",
  "phone": "3227831753",
  "team": "Marketing"
}
```

`billingCountry` is a free text label picked from a dropdown (Pakistan, South Korea, United Arab Emirates, or Other) and is separate from `countryCode`, which is only used for the WhatsApp number. Someone booking from a different country can still book a demo for a Pakistan based shop, so don't assume these two match.

Success response (200):

```json
{ "message": "Demo booked, we'll be in touch" }
```

## Not built yet, but the frontend already has the click handlers wired up

These two are stubbed on the frontend and currently just show a "not available yet" message when clicked. No rush on these, but here is what they'll need when you're ready:

- **Sign up / log in with Google** - `signUpWithProvider("google")` and `loginWithProvider("google")` in `src/lib/api.ts`. This will probably be a redirect to Google's OAuth screen rather than a normal POST request, so the shape here is up to you, just let us know what URL to redirect to.
- **Sign up with Facebook** - same idea as Google, via `signUpWithProvider("facebook")`.

## Countries we support

Both the signup form and the demo form use the same list, defined in `src/lib/countries.ts`:

| Code | Country | Dial code |
| --- | --- | --- |
| PK | Pakistan | +92 |
| KR | South Korea | +82 |
| AE | United Arab Emirates | +971 |

If we add a new market, that file is the only place the frontend needs to change, so just let me know and I'll add it.
