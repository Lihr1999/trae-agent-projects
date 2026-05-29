import { PresetScenario, SimulationConfig, MapElement, Seat, Employee, DEFAULT_CONFIG } from '../types';
import { PRESET_SCENARIOS } from './scenarios';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface LoadedScenario {
  scenario: PresetScenario;
  config: SimulationConfig;
  mapElements: MapElement[];
  seats: Seat[];
  employees: Employee[];
}

export class PresetManager {
  private scenarios: PresetScenario[];

  constructor(customScenarios?: PresetScenario[]) {
    this.scenarios = customScenarios || PRESET_SCENARIOS;
  }

  public getScenarios(): PresetScenario[] {
    return [...this.scenarios];
  }

  public getScenarioById(id: string): PresetScenario | undefined {
    return this.scenarios.find(s => s.id === id);
  }

  public getScenarioByName(name: string): PresetScenario | undefined {
    return this.scenarios.find(s => s.name === name);
  }

  public loadScenario(scenarioId: string): LoadedScenario {
    const scenario = this.getScenarioById(scenarioId);
    if (!scenario) {
      throw new Error(`场景不存在: ${scenarioId}`);
    }

    const validation = this.validateScenario(scenario);
    if (!validation.valid) {
      throw new Error(`场景验证失败: ${validation.errors.join(', ')}`);
    }

    const mergedConfig = this.mergeConfig(scenario.config);
    const employees = this.assignEmployeeIds(scenario.employees);

    return {
      scenario,
      config: mergedConfig,
      mapElements: [...scenario.mapElements],
      seats: scenario.seats.map(s => ({ ...s, occupied: 0, reserved: false })),
      employees,
    };
  }

  public validateScenario(scenario: PresetScenario): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!scenario.id || scenario.id.trim() === '') {
      errors.push('场景ID不能为空');
    }

    if (!scenario.name || scenario.name.trim() === '') {
      errors.push('场景名称不能为空');
    }

    if (!scenario.description || scenario.description.trim() === '') {
      warnings.push('场景描述为空');
    }

    if (!scenario.icon || scenario.icon.trim() === '') {
      warnings.push('场景图标为空');
    }

    if (!scenario.mapElements || scenario.mapElements.length === 0) {
      errors.push('场景必须包含至少一个地图元素');
    } else {
      this.validateMapElements(scenario.mapElements, errors, warnings);
    }

    if (!scenario.seats || scenario.seats.length === 0) {
      warnings.push('场景不包含任何座位');
    } else {
      this.validateSeats(scenario.seats, errors, warnings);
    }

    if (!scenario.employees || scenario.employees.length === 0) {
      warnings.push('场景不包含任何员工');
    } else {
      this.validateEmployees(scenario.employees, errors, warnings);
    }

    if (scenario.config) {
      this.validateConfig(scenario.config, errors, warnings);
    }

    if (scenario.anomalyTrigger && scenario.anomalyTrigger.trim() === '') {
      warnings.push('异常触发条件为空字符串');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  public validateAllScenarios(): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();
    for (const scenario of this.scenarios) {
      results.set(scenario.id, this.validateScenario(scenario));
    }
    return results;
  }

  public addScenario(scenario: PresetScenario): ValidationResult {
    const validation = this.validateScenario(scenario);
    if (!validation.valid) {
      return validation;
    }

    if (this.scenarios.some(s => s.id === scenario.id)) {
      validation.valid = false;
      validation.errors.push(`场景ID已存在: ${scenario.id}`);
      return validation;
    }

    this.scenarios.push(scenario);
    return validation;
  }

  public removeScenario(scenarioId: string): boolean {
    const index = this.scenarios.findIndex(s => s.id === scenarioId);
    if (index === -1) {
      return false;
    }
    this.scenarios.splice(index, 1);
    return true;
  }

  public updateScenario(scenarioId: string, updates: Partial<PresetScenario>): ValidationResult {
    const index = this.scenarios.findIndex(s => s.id === scenarioId);
    if (index === -1) {
      return {
        valid: false,
        errors: [`场景不存在: ${scenarioId}`],
        warnings: [],
      };
    }

    const updatedScenario = { ...this.scenarios[index], ...updates };
    const validation = this.validateScenario(updatedScenario);
    if (!validation.valid) {
      return validation;
    }

    if (updates.id && updates.id !== scenarioId) {
      if (this.scenarios.some((s, i) => i !== index && s.id === updates.id)) {
        validation.valid = false;
        validation.errors.push(`场景ID已存在: ${updates.id}`);
        return validation;
      }
    }

    this.scenarios[index] = updatedScenario;
    return validation;
  }

  private validateMapElements(elements: MapElement[], errors: string[], warnings: string[]): void {
    const ids = new Set<string>();

    const hasEntrance = elements.some(e => e.type === 'entrance');
    if (!hasEntrance) {
      errors.push('地图必须包含至少一个入口');
    }

    const hasBar = elements.some(e => e.type === 'bar');
    if (!hasBar) {
      errors.push('地图必须包含至少一个吧台');
    }

    for (const element of elements) {
      if (!element.id || element.id.trim() === '') {
        errors.push('地图元素ID不能为空');
        continue;
      }

      if (ids.has(element.id)) {
        errors.push(`地图元素ID重复: ${element.id}`);
      }
      ids.add(element.id);

      if (!element.polygon || element.polygon.length < 3) {
        errors.push(`地图元素 ${element.id} 的多边形至少需要3个点`);
      }

      if (!element.type) {
        errors.push(`地图元素 ${element.id} 的类型不能为空`);
      }

      const validTypes = ['bar', 'seat', 'entrance', 'obstacle'];
      if (!validTypes.includes(element.type)) {
        errors.push(`地图元素 ${element.id} 的类型无效: ${element.type}`);
      }
    }
  }

  private validateSeats(seats: Seat[], errors: string[], warnings: string[]): void {
    const ids = new Set<string>();

    for (const seat of seats) {
      if (!seat.id || seat.id.trim() === '') {
        errors.push('座位ID不能为空');
        continue;
      }

      if (ids.has(seat.id)) {
        errors.push(`座位ID重复: ${seat.id}`);
      }
      ids.add(seat.id);

      if (!seat.position) {
        errors.push(`座位 ${seat.id} 缺少位置信息`);
      }

      if (seat.capacity <= 0) {
        errors.push(`座位 ${seat.id} 的容量必须大于0`);
      }

      if (seat.capacity > 8) {
        warnings.push(`座位 ${seat.id} 的容量 ${seat.capacity} 可能过大`);
      }
    }
  }

  private validateEmployees(employees: Omit<Employee, 'id'>[], errors: string[], warnings: string[]): void {
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];

      if (!emp.position) {
        errors.push(`员工 ${i} 缺少位置信息`);
      }

      if (!emp.station) {
        errors.push(`员工 ${i} 缺少工作站信息`);
      }

      if (!emp.skillMatrix || emp.skillMatrix.length === 0) {
        errors.push(`员工 ${i} 缺少技能矩阵`);
      } else {
        for (let j = 0; j < emp.skillMatrix.length; j++) {
          const skill = emp.skillMatrix[j];
          if (skill < 0 || skill > 1) {
            errors.push(`员工 ${i} 的技能 ${j} 值必须在 [0, 1] 范围内`);
          }
        }
      }

      if (emp.fatigue < 0 || emp.fatigue > 1) {
        errors.push(`员工 ${i} 的疲劳值必须在 [0, 1] 范围内`);
      }

      if (emp.efficiency <= 0) {
        errors.push(`员工 ${i} 的效率必须大于0`);
      }
    }
  }

  private validateConfig(config: Partial<SimulationConfig>, errors: string[], warnings: string[]): void {
    if (config.mapWidth !== undefined && config.mapWidth <= 0) {
      errors.push('地图宽度必须大于0');
    }

    if (config.mapHeight !== undefined && config.mapHeight <= 0) {
      errors.push('地图高度必须大于0');
    }

    if (config.maxAgents !== undefined && config.maxAgents <= 0) {
      errors.push('最大代理数必须大于0');
    }

    if (config.timeStep !== undefined && config.timeStep <= 0) {
      errors.push('时间步长必须大于0');
    }

    if (config.arrivalModel) {
      if (config.arrivalModel.lambda <= 0) {
        errors.push('到达率lambda必须大于0');
      }

      const sumDist = config.arrivalModel.groupSizeDistribution.reduce((a, b) => a + b, 0);
      if (Math.abs(sumDist - 1.0) > 0.01) {
        warnings.push(`群组大小分布之和为 ${sumDist.toFixed(2)}，建议接近1.0`);
      }
    }

    if (config.lbmParams) {
      if (config.lbmParams.relaxationTime < 0.5) {
        warnings.push('LBM松弛时间过小可能导致数值不稳定');
      }
      if (config.lbmParams.viscosity <= 0) {
        errors.push('LBM粘度必须大于0');
      }
    }

    if (config.sirParams) {
      if (config.sirParams.beta < 0 || config.sirParams.beta > 1) {
        errors.push('SIR传染率beta必须在 [0, 1] 范围内');
      }
      if (config.sirParams.gamma < 0 || config.sirParams.gamma > 1) {
        errors.push('SIR恢复率gamma必须在 [0, 1] 范围内');
      }
    }
  }

  private mergeConfig(partialConfig: Partial<SimulationConfig> | undefined): SimulationConfig {
    return {
      ...DEFAULT_CONFIG,
      ...partialConfig,
      id: partialConfig?.id || DEFAULT_CONFIG.id,
      name: partialConfig?.name || DEFAULT_CONFIG.name,
      queuingTopology: {
        ...DEFAULT_CONFIG.queuingTopology,
        ...partialConfig?.queuingTopology,
      },
      arrivalModel: {
        ...DEFAULT_CONFIG.arrivalModel,
        ...partialConfig?.arrivalModel,
      },
      socialForce: {
        ...DEFAULT_CONFIG.socialForce,
        ...partialConfig?.socialForce,
      },
      lbmParams: {
        ...DEFAULT_CONFIG.lbmParams,
        ...partialConfig?.lbmParams,
      },
      sirParams: {
        ...DEFAULT_CONFIG.sirParams,
        ...partialConfig?.sirParams,
      },
      employeeConfig: {
        ...DEFAULT_CONFIG.employeeConfig,
        ...partialConfig?.employeeConfig,
      },
    };
  }

  private assignEmployeeIds(employeeTemplates: Omit<Employee, 'id'>[]): Employee[] {
    return employeeTemplates.map((template, index) => ({
      ...template,
      id: `emp-${Date.now()}-${index}`,
    }));
  }
}
