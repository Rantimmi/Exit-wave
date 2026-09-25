import asyncio


#stores temp login info while user is signing in.

pending_logins = {}

def run_async(coro):
    loop = asyncio.new_event_loop()
    
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()