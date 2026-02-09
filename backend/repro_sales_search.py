import requests
import time

BASE_URL = "http://localhost:8000"

def test_search(query):
    print(f"Testing search with query: '{query}'")
    start = time.time()
    try:
        response = requests.get(f"{BASE_URL}/sales/", params={"search": query})
        elapsed = time.time() - start
        print(f"Status: {response.status_code}, Time: {elapsed:.3f}s")
        if response.status_code == 200:
            data = response.json()
            print(f"Items found: {len(data.get('items', []))}")
        else:
            print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {e}")

print("--- Testing Sales Search Endpoint ---")
test_search("P")
test_search("Pa")
test_search("Pan")

print("\n--- Testing Employee Search Endpoint (Modal) ---")
try:
    response = requests.get(f"{BASE_URL}/sales/employees/search", params={"q": "Pa"})
    print(f"Employee Search 'Pa': Status {response.status_code}")
    if response.status_code == 200:
        print(f"Employees found: {len(response.json())}")
except Exception as e:
    print(e)
