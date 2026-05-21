import anthropic
import os

def generate_snort_rule(prompt: str) -> str:
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set")
    
    client = anthropic.Anthropic(api_key=api_key)

    system_prompt = """You are a Snort IDS rule expert. 
Generate a valid Snort 2 rule based on the user's description.
Return ONLY the raw Snort rule text, nothing else. No explanation, no markdown, no backticks.
Example output: alert tcp any any -> any 80 (msg:"HTTP traffic"; sid:1000001; rev:1;)
Rules must follow Snort 2 syntax exactly."""

    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
        system=system_prompt
    )
    return message.content[0].text.strip()