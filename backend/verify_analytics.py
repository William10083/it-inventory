import requests
import json

try:
    response = requests.get('http://localhost:8000/analytics/?location=Callao')
    data = response.json()['devices']
    
    print("-" * 50)
    print("ANALYTICS FOR CALLAO (VERIFICATION)")
    print("-" * 50)
    print(f"Kits: {data['kit teclado/mouse']['assigned']}")
    print(f"Mochilas: {data['mochila']['assigned']}")
    print(f"Auriculares: {data['auriculares']['assigned']}")
    print("-" * 50)
    
except Exception as e:
    print(f"Error: {e}")
