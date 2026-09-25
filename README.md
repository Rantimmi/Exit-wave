# ExitWave

ExitWave is a Flask web application for viewing the Telegram groups and channels connected to your account, selecting them, and leaving several at once.

It uses [Telethon](https://docs.telethon.dev/) to communicate with Telegram. You provide your own Telegram API ID and API hash through the web interface, authenticate with Telegram, choose chats, and then leave the selected chats.

## Features

- Sign in to Telegram with an API ID, API hash, phone number, and verification code.
- Supports Telegram two-factor authentication (2FA).
- Lists groups and broadcast channels associated with the signed-in account.
- Lets you select multiple chats to leave.
- Spaces leave requests out to reduce the chance of Telegram flood limits.

## Project structure

```text
Telegram-bulk-leave/
├── app.py                         # Application entry point
├── telegram_leaver/
│   ├── __init__.py                # Creates and configures the Flask app
│   ├── routes/
│   │   ├── pages.py               # Browser page routes
│   │   ├── auth.py                # Telegram sign-in API routes
│   │   └── chats.py               # Chat listing and leaving API routes
│   └── services/
│       └── telegram.py            # Shared async/Telethon helpers
├── templates/
│   └── index.html                 # Main page
├── static/                        # CSS and browser JavaScript
├── requirements.txt
└── .env                           # Local secrets; do not commit this file
```

## Requirements

- Python 3.10 or newer
- A Telegram account
- A Telegram API ID and API hash from [my.telegram.org/apps](https://my.telegram.org/apps)

## Local setup

1. Clone or download this repository, then enter its folder.

2. Create and activate a virtual environment:

   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```

   On Windows PowerShell:

   ```powershell
   .venv\Scripts\Activate.ps1
   ```

3. Install the dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the project root:

   ```env
   FLASK_SECRET_KEY=replace-this-with-a-long-random-secret
   ```

   Generate a suitable secret with:

   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```

5. Start the application:

   ```bash
   python app.py
   ```

6. Open `http://127.0.0.1:5000` in your browser.

## How to use it

1. Get your API ID and API hash from [my.telegram.org/apps](https://my.telegram.org/apps).
2. Enter them on the first screen.
3. Enter the phone number connected to your Telegram account, including the country code.
4. Enter the login code Telegram sends you. Enter your 2FA password too if your account uses one.
5. Select the groups or channels you want to leave and confirm the action.

## Deployment notes

Set `FLASK_SECRET_KEY` in your hosting provider's environment-variable settings. Do not upload or commit `.env`.

The WSGI entry point is:

```text
app:app
```

For example, a Gunicorn start command is:

```bash
gunicorn app:app
```

### Important deployment limitation

Temporary login information is currently held in the application process's memory while a Telegram sign-in is in progress. For reliable login verification, deploy with **one web worker** and avoid restarting the application between requesting and entering the Telegram code. If the application is later scaled to multiple workers or servers, this temporary state should move to shared storage such as Redis.

## Security notes

- Never commit `.env`, API hashes, Flask secret keys, login codes, or 2FA passwords.
- Use HTTPS in production.
- Only sign in with an account you own or are authorized to manage.
- Telegram may apply rate limits; ExitWave waits 1.5 seconds between leave requests, but limits can still occur.

## License

Add a license file if you plan to distribute this project publicly.
