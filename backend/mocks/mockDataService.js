/**
 * Mock data service for testing report generation
 * Provides realistic India-specific KPI data
 */

const crypto = require('crypto');
const moment = require('moment-timezone');

class MockDataService {
  /**
   * Generate mock KPI data for testing
   * @param {Object} options - Options for data generation
   * @returns {Object} Mock report data
   */
  static generateMockReportData(options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      companyName = 'Tech Solutions India Pvt Ltd',
    } = options;

    const reportId = `RPT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    return {
      reportId,
      startDate,
      endDate,
      companyName,
      generatedBy: 'Test User',
      generatorEmail: 'test@example.com',
      kpis: this.generateMockKPIs(),
      financialMetrics: this.generateMockFinancialMetrics(),
      performanceMetrics: this.generateMockPerformanceMetrics(),
      employeeStats: this.generateMockEmployeeStats(),
      customerStats: this.generateMockCustomerStats(),
    };
  }

  /**
   * Generate mock KPIs
   * @returns {Array} Array of KPI objects
   */
  static generateMockKPIs() {
    return [
      {
        name: 'Monthly Revenue',
        value: 2500000,
        isCurrency: true,
        target: 2000000,
      },
      {
        name: 'Active Customers',
        value: 450,
        isCurrency: false,
        target: 400,
      },
      {
        name: 'Customer Satisfaction Score',
        value: 4.5,
        isCurrency: false,
        target: 4.0,
      },
      {
        name: 'Employee Productivity',
        value: 87.5,
        isCurrency: false,
        target: 85.0,
      },
      {
        name: 'Average Deal Size',
        value: 125000,
        isCurrency: true,
        target: 100000,
      },
    ];
  }

  /**
   * Generate mock financial metrics
   * @returns {Object} Financial metrics object
   */
  static generateMockFinancialMetrics() {
    const totalRevenue = 2500000;
    const totalExpenses = 1750000;
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = (netProfit / totalRevenue) * 100;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      avgDealValue: 125000,
    };
  }

  /**
   * Generate mock performance metrics
   * @returns {Object} Performance metrics object
   */
  static generateMockPerformanceMetrics() {
    const tasksCompleted = 156;
    const tasksPending = 24;
    const totalTasks = tasksCompleted + tasksPending;
    const completionRate = (tasksCompleted / totalTasks) * 100;

    return {
      tasksCompleted,
      tasksPending,
      completionRate,
      avgResponseTime: 4.2,
      customerSatisfaction: 4.5,
    };
  }

  /**
   * Generate mock employee statistics
   * @returns {Object} Employee stats object
   */
  static generateMockEmployeeStats() {
    return {
      totalEmployees: 85,
      activeEmployees: 82,
      avgProductivity: 87.5,
      departmentCount: 8,
    };
  }

  /**
   * Generate mock customer statistics
   * @returns {Object} Customer stats object
   */
  static generateMockCustomerStats() {
    return {
      totalCustomers: 450,
      activeCustomers: 420,
      newCustomers: 35,
      retentionRate: 93.3,
      avgLifetimeValue: 875000,
    };
  }

  /**
   * Generate mock user data
   * @param {string} role - User role
   * @returns {Object} Mock user object
   */
  static generateMockUser(role = 'admin') {
    return {
      _id: crypto.randomBytes(12).toString('hex'),
      email: `test.${role}@example.com`,
      fullName: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      role: role,
    };
  }

  /**
   * Generate random date range
   * @param {number} daysBack - Number of days back from today
   * @returns {Object} Object with startDate and endDate
   */
  static generateDateRange(daysBack = 30) {
    const endDate = new Date();
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    return { startDate, endDate };
  }

  /**
   * Generate mock email recipients list
   * @param {number} count - Number of recipients
   * @returns {Array} Array of email addresses
   */
  static generateMockRecipients(count = 3) {
    const recipients = [];
    for (let i = 0; i < count; i++) {
      recipients.push(`recipient${i + 1}@example.com`);
    }
    return recipients;
  }

  /**
   * Generate realistic Indian company names
   * @returns {string} Company name
   */
  static generateRandomCompanyName() {
    const companies = [
      'Tech Solutions India Pvt Ltd',
      'Digital Innovations Pvt Ltd',
      'Smart Systems India',
      'Enterprise Solutions Pvt Ltd',
      'InfoTech Services India',
      'Global IT Solutions',
      'NextGen Technologies Pvt Ltd',
      'Advanced Computing India',
    ];

    return companies[Math.floor(Math.random() * companies.length)];
  }

  /**
   * Simulate API delay
   * @param {number} ms - Delay in milliseconds
   * @returns {Promise} Promise that resolves after delay
   */
  static async delay(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate mock report with random values
   * @returns {Object} Mock report data with randomized values
   */
  static generateRandomReportData() {
    const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const randomFloat = (min, max, decimals = 2) =>
      (Math.random() * (max - min) + min).toFixed(decimals);

    const dateRange = this.generateDateRange(random(7, 90));

    return {
      reportId: `RPT-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      ...dateRange,
      companyName: this.generateRandomCompanyName(),
      generatedBy: 'Test User',
      kpis: [
        {
          name: 'Monthly Revenue',
          value: random(1000000, 5000000),
          isCurrency: true,
          target: random(800000, 4000000),
        },
        {
          name: 'Active Customers',
          value: random(200, 1000),
          isCurrency: false,
          target: random(150, 800),
        },
        {
          name: 'Customer Satisfaction',
          value: parseFloat(randomFloat(3.5, 5.0)),
          isCurrency: false,
          target: 4.0,
        },
      ],
      financialMetrics: {
        totalRevenue: random(2000000, 10000000),
        totalExpenses: random(1000000, 7000000),
        netProfit: random(500000, 3000000),
        profitMargin: parseFloat(randomFloat(10, 40)),
        avgDealValue: random(50000, 300000),
      },
      performanceMetrics: {
        tasksCompleted: random(100, 500),
        tasksPending: random(10, 100),
        completionRate: parseFloat(randomFloat(70, 95)),
        avgResponseTime: parseFloat(randomFloat(2, 8)),
        customerSatisfaction: parseFloat(randomFloat(3.5, 5.0)),
      },
      employeeStats: {
        totalEmployees: random(50, 200),
        activeEmployees: random(45, 190),
        avgProductivity: parseFloat(randomFloat(75, 95)),
        departmentCount: random(5, 15),
      },
      customerStats: {
        totalCustomers: random(300, 1000),
        activeCustomers: random(250, 950),
        newCustomers: random(20, 100),
        retentionRate: parseFloat(randomFloat(85, 98)),
        avgLifetimeValue: random(500000, 2000000),
      },
    };
  }
}

module.exports = MockDataService;
