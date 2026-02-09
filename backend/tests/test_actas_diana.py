import requests

r = requests.get('http://localhost:8000/actas-status/', params={'search': 'DIANA'})
data = r.json()

print('DIANA LAZARO ACTAS STATUS:')
print('=' * 80)

# Assignment Computer
computer = [x for x in data['assignment_computer'] if 'DIANA' in x['employee_name']]
print(f"\n1. ASSIGNMENT COMPUTER: {len(computer)} entries")
for x in computer:
    status = "HAS ACTA" if x['has_acta'] else "NO ACTA"
    print(f"   - {x['employee_name']}: {status}")
    if x['has_acta']:
        print(f"     Path: {x['acta_path']}")

# Assignment Mobile
mobile = [x for x in data['assignment_mobile'] if 'DIANA' in x['employee_name']]
print(f"\n2. ASSIGNMENT MOBILE: {len(mobile)} entries")
for x in mobile:
    status = "HAS ACTA" if x['has_acta'] else "NO ACTA"
    print(f"   - {x['employee_name']}: {status}")
    if x['has_acta']:
        print(f"     Path: {x['acta_path']}")

# Sales
sales = [x for x in data['sales'] if 'DIANA' in x['employee_name']]
print(f"\n3. SALES: {len(sales)} entries")
for x in sales:
    status = "HAS ACTA" if x['has_acta'] else "NO ACTA"
    print(f"   - {x['employee_name']}: {status}")
    if x['has_acta']:
        print(f"     Path: {x['acta_path']}")

print('\n' + '=' * 80)
print('SUMMARY:')
print(f"  Assignment Computer: {data['summary']['assignment_computer_total']} total, {data['summary']['assignment_computer_signed']} signed, {data['summary']['assignment_computer_pending']} pending")
print(f"  Assignment Mobile: {data['summary']['assignment_mobile_total']} total, {data['summary']['assignment_mobile_signed']} signed, {data['summary']['assignment_mobile_pending']} pending")
print(f"  Sales: {data['summary']['sales_total']} total, {data['summary']['sales_signed']} signed, {data['summary']['sales_pending']} pending")
print('=' * 80)
