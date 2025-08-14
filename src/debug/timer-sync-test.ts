/**
 * Timer Synchronization Debug Script
 * This script helps debug timer synchronization issues between control match and audience display
 */

import { unifiedWebSocketService } from '@/lib/unified-websocket';
import { UserRole } from '@/types/types';

interface TestTimerData {
  duration: number;
  remaining: number;
  isRunning: boolean;
  startedAt?: number;
  pausedAt?: number;
  period?: string;
  tournamentId: string;
  fieldId?: string;
}

class TimerSyncTester {
  private tournamentId = 'test-tournament-123';
  private fieldId = 'test-field-a';
  private isConnected = false;

  async initialize() {
    console.log('🔧 Initializing Timer Sync Tester...');
    
    // Set user role
    unifiedWebSocketService.setUserRole(UserRole.HEAD_REFEREE);
    
    // Connect to WebSocket
    try {
      await unifiedWebSocketService.connect();
      this.isConnected = true;
      console.log('✅ Connected to WebSocket service');
    } catch (error) {
      console.error('❌ Failed to connect to WebSocket:', error);
      return false;
    }

    // Join tournament and field rooms
    unifiedWebSocketService.joinTournament(this.tournamentId);
    unifiedWebSocketService.joinFieldRoom(this.fieldId);
    console.log(`📡 Joined tournament: ${this.tournamentId}, field: ${this.fieldId}`);

    // Set up event listeners
    this.setupEventListeners();
    
    return true;
  }

  private setupEventListeners() {
    console.log('👂 Setting up event listeners...');
    
    // Listen for timer events
    unifiedWebSocketService.on('timer_update', (data: any) => {
      console.log('📨 Received timer_update:', data);
    });

    unifiedWebSocketService.on('timer_start', (data: any) => {
      console.log('📨 Received timer_start:', data);
    });

    unifiedWebSocketService.on('timer_pause', (data: any) => {
      console.log('📨 Received timer_pause:', data);
    });

    unifiedWebSocketService.on('timer_reset', (data: any) => {
      console.log('📨 Received timer_reset:', data);
    });
  }

  async testTimerStart() {
    if (!this.isConnected) {
      console.error('❌ Not connected to WebSocket');
      return;
    }

    console.log('🚀 Testing timer start...');
    
    const timerData: TestTimerData = {
      duration: 150000, // 2:30 in ms
      remaining: 150000,
      isRunning: true,
      startedAt: Date.now(),
      period: 'auto',
      tournamentId: this.tournamentId,
      fieldId: this.fieldId
    };

    console.log('📤 Emitting timer_start with data:', timerData);
    unifiedWebSocketService.startTimer(timerData);
  }

  async testTimerUpdate() {
    if (!this.isConnected) {
      console.error('❌ Not connected to WebSocket');
      return;
    }

    console.log('🔄 Testing timer update...');
    
    const timerData: TestTimerData = {
      duration: 150000,
      remaining: 120000, // 2:00 remaining
      isRunning: true,
      startedAt: Date.now() - 30000, // Started 30 seconds ago
      period: 'teleop',
      tournamentId: this.tournamentId,
      fieldId: this.fieldId
    };

    console.log('📤 Emitting timer_update with data:', timerData);
    unifiedWebSocketService.sendTimerUpdate(timerData);
  }

  async testTimerPause() {
    if (!this.isConnected) {
      console.error('❌ Not connected to WebSocket');
      return;
    }

    console.log('⏸️ Testing timer pause...');
    
    const timerData: TestTimerData = {
      duration: 150000,
      remaining: 90000, // 1:30 remaining
      isRunning: false,
      pausedAt: Date.now(),
      period: 'teleop',
      tournamentId: this.tournamentId,
      fieldId: this.fieldId
    };

    console.log('📤 Emitting timer_pause with data:', timerData);
    unifiedWebSocketService.pauseTimer(timerData);
  }

  async testTimerReset() {
    if (!this.isConnected) {
      console.error('❌ Not connected to WebSocket');
      return;
    }

    console.log('🔄 Testing timer reset...');
    
    const timerData: TestTimerData = {
      duration: 150000,
      remaining: 150000, // Reset to full duration
      isRunning: false,
      period: 'auto',
      tournamentId: this.tournamentId,
      fieldId: this.fieldId
    };

    console.log('📤 Emitting timer_reset with data:', timerData);
    unifiedWebSocketService.resetTimer(timerData);
  }

  async runFullTest() {
    console.log('🧪 Running full timer synchronization test...');
    
    if (!(await this.initialize())) {
      return;
    }

    // Wait a bit for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test timer start
    await this.testTimerStart();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test timer update
    await this.testTimerUpdate();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test timer pause
    await this.testTimerPause();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test timer reset
    await this.testTimerReset();
    
    console.log('✅ Timer synchronization test completed');
  }

  async testPeriodTransitions() {
    if (!this.isConnected) {
      console.error('❌ Not connected to WebSocket');
      return;
    }

    console.log('🔄 Testing period transitions...');

    // Test auto period
    const autoData: TestTimerData = {
      duration: 150000,
      remaining: 150000,
      isRunning: true,
      startedAt: Date.now(),
      period: 'auto',
      tournamentId: this.tournamentId,
      fieldId: this.fieldId
    };

    console.log('📤 Emitting auto period timer_start:', autoData);
    unifiedWebSocketService.startTimer(autoData);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test teleop period
    const teleopData: TestTimerData = {
      duration: 150000,
      remaining: 120000,
      isRunning: true,
      startedAt: Date.now() - 30000,
      period: 'teleop',
      tournamentId: this.tournamentId,
      fieldId: this.fieldId
    };

    console.log('📤 Emitting teleop period timer_update:', teleopData);
    unifiedWebSocketService.sendTimerUpdate(teleopData);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test endgame period
    const endgameData: TestTimerData = {
      duration: 150000,
      remaining: 25000,
      isRunning: true,
      startedAt: Date.now() - 125000,
      period: 'endgame',
      tournamentId: this.tournamentId,
      fieldId: this.fieldId
    };

    console.log('📤 Emitting endgame period timer_update:', endgameData);
    unifiedWebSocketService.sendTimerUpdate(endgameData);
  }

  async runComprehensiveTest() {
    console.log('🧪 Running comprehensive timer synchronization test...');

    if (!(await this.initialize())) {
      return;
    }

    // Wait for connection to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test timer start with 2:30 duration
    await this.testTimerStart();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test period transitions
    await this.testPeriodTransitions();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test timer pause
    await this.testTimerPause();
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test timer reset
    await this.testTimerReset();

    console.log('✅ Comprehensive timer synchronization test completed');
  }

  disconnect() {
    if (this.isConnected) {
      unifiedWebSocketService.disconnect();
      this.isConnected = false;
      console.log('🔌 Disconnected from WebSocket service');
    }
  }
}

// Export for use in browser console or testing
export const timerSyncTester = new TimerSyncTester();

// Auto-run test if this file is executed directly
if (typeof window !== 'undefined') {
  (window as any).timerSyncTester = timerSyncTester;
  console.log('🔧 Timer Sync Tester available as window.timerSyncTester');
  console.log('📝 Available test methods:');
  console.log('  - timerSyncTester.runFullTest() - Basic timer operations');
  console.log('  - timerSyncTester.runComprehensiveTest() - Full test including period transitions');
  console.log('  - timerSyncTester.testPeriodTransitions() - Test period changes only');
}
