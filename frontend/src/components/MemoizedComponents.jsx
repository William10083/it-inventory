import React from 'react';
import AnalyticsDashboard from './AnalyticsDashboard';
import DeviceDetailsModal from './DeviceDetailsModal';
import AssignmentModal from './AssignmentModal';
import ManualDeviceModal from './ManualDeviceModal';
import EmployeeRegistrationModal from './EmployeeRegistrationModal';
import TerminationModal from './TerminationModal';

// Memoized versions of heavy components to prevent unnecessary re-renders
export const MemoizedAnalyticsDashboard = React.memo(AnalyticsDashboard);
export const MemoizedDeviceDetailsModal = React.memo(DeviceDetailsModal);
export const MemoizedAssignmentModal = React.memo(AssignmentModal);
export const MemoizedManualDeviceModal = React.memo(ManualDeviceModal);
export const MemoizedEmployeeRegistrationModal = React.memo(EmployeeRegistrationModal);
export const MemoizedTerminationModal = React.memo(TerminationModal);
