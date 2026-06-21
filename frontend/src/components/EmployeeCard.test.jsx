import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import EmployeeCard from './EmployeeCard'

const baseEmployee = {
  id: 1,
  full_name: 'Juan Perez',
  email: 'juan.perez@example.com',
  department: 'IT',
  dni: '12345678',
  company: 'Acme',
  location: 'Callao',
  hire_date: '2024-01-01',
  expected_laptop_count: 1,
  expected_celular_count: 0,
  is_active: true,
  assets: [],
}

function renderEmployeeCard(employeeOverrides = {}) {
  const employee = { ...baseEmployee, ...employeeOverrides }
  return render(
    <EmployeeCard
      employee={employee}
      missingEquipment={[]}
      onDownloadActa={vi.fn()}
      onEditEmployee={vi.fn()}
      onTerminateEmployee={vi.fn()}
      onUpdateLocation={vi.fn()}
      onViewDetails={vi.fn()}
      onUnassignDevice={vi.fn()}
      renderAssetCard={vi.fn()}
    />
  )
}

describe('EmployeeCard', () => {
  it('renders employee identity fields without crashing', () => {
    renderEmployeeCard()

    expect(screen.getByText('Juan Perez')).toBeInTheDocument()
    expect(screen.getByText(/IT/)).toBeInTheDocument()
    expect(screen.getByText(/12345678/)).toBeInTheDocument()
  })

  it('shows the empty-assets placeholder when the employee has no assigned equipment', () => {
    renderEmployeeCard({ assets: [] })

    expect(screen.getByText('Sin equipos asignados')).toBeInTheDocument()
  })
})
