import { WaveGenerator } from './waveGenerator';
import type { Order, SKU, Location } from '../types';

describe('WaveGenerator', () => {
  const defaultOptions = {
    maxOrdersPerWave: 5,
    maxItemsPerWave: 50,
    priorityWeights: { low: 1, medium: 2, high: 3, urgent: 4 },
  };

  const testSkus: SKU[] = [
    {
      id: 'sku1',
      code: 'SKU001',
      name: 'Product A',
      category: 'Electronics',
      weight: 0.5,
      volume: 0.1,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'sku2',
      code: 'SKU002',
      name: 'Product B',
      category: 'Electronics',
      weight: 0.3,
      volume: 0.05,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'sku3',
      code: 'SKU003',
      name: 'Product C',
      category: 'Clothing',
      weight: 0.2,
      volume: 0.15,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const testLocations: Location[] = [
    {
      id: 'loc1',
      rackId: 'rack1',
      code: 'A-01-01',
      row: 1,
      column: 1,
      level: 1,
      status: 'occupied',
      skuId: 'sku1',
      quantity: 10,
      maxQuantity: 20,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
    {
      id: 'loc2',
      rackId: 'rack1',
      code: 'A-01-02',
      row: 1,
      column: 2,
      level: 1,
      status: 'occupied',
      skuId: 'sku2',
      quantity: 5,
      maxQuantity: 20,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ];

  const createOrder = (
    id: string,
    priority: 'low' | 'medium' | 'high' | 'urgent',
    items: { skuId: string; quantity: number }[]
  ): Order => ({
    id,
    orderNo: `ORD${id}`,
    priority,
    status: 'pending',
    items: items.map((i) => ({
      skuId: i.skuId,
      skuName: testSkus.find((s) => s.id === i.skuId)?.name || '',
      quantity: i.quantity,
    })),
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  });

  describe('constructor', () => {
    it('should create a WaveGenerator with options', () => {
      const generator = new WaveGenerator(defaultOptions);
      expect(generator).toBeInstanceOf(WaveGenerator);
    });
  });

  describe('generateWaves', () => {
    it('should return empty array when no pending orders', () => {
      const generator = new WaveGenerator(defaultOptions);
      const orders: Order[] = [];
      const waves = generator.generateWaves(orders, testSkus, testLocations);
      expect(waves).toEqual([]);
    });

    it('should generate a single wave for few orders', () => {
      const generator = new WaveGenerator(defaultOptions);
      const orders = [
        createOrder('order1', 'medium', [{ skuId: 'sku1', quantity: 2 }]),
        createOrder('order2', 'medium', [{ skuId: 'sku2', quantity: 1 }]),
      ];

      const waves = generator.generateWaves(orders, testSkus, testLocations);
      expect(waves.length).toBe(1);
      expect(waves[0].orderIds.length).toBe(2);
    });

    it('should split orders into multiple waves based on maxOrdersPerWave', () => {
      const generator = new WaveGenerator({
        ...defaultOptions,
        maxOrdersPerWave: 2,
      });
      const orders = [
        createOrder('order1', 'medium', [{ skuId: 'sku1', quantity: 1 }]),
        createOrder('order2', 'medium', [{ skuId: 'sku1', quantity: 1 }]),
        createOrder('order3', 'medium', [{ skuId: 'sku1', quantity: 1 }]),
      ];

      const waves = generator.generateWaves(orders, testSkus, testLocations);
      expect(waves.length).toBe(2);
      expect(waves[0].orderIds.length).toBe(2);
      expect(waves[1].orderIds.length).toBe(1);
    });

    it('should prioritize urgent orders first', () => {
      const generator = new WaveGenerator(defaultOptions);
      const orders = [
        createOrder('order1', 'low', [{ skuId: 'sku1', quantity: 1 }]),
        createOrder('order2', 'urgent', [{ skuId: 'sku1', quantity: 1 }]),
        createOrder('order3', 'medium', [{ skuId: 'sku1', quantity: 1 }]),
      ];

      const waves = generator.generateWaves(orders, testSkus, testLocations);
      expect(waves[0].orderIds[0]).toBe('order2');
    });

    it('should group similar orders together', () => {
      const generator = new WaveGenerator(defaultOptions);
      const orders = [
        createOrder('order1', 'medium', [{ skuId: 'sku1', quantity: 1 }]),
        createOrder('order2', 'medium', [{ skuId: 'sku3', quantity: 1 }]),
        createOrder('order3', 'medium', [{ skuId: 'sku1', quantity: 1 }]),
      ];

      const waves = generator.generateWaves(orders, testSkus, testLocations);
      const waveOrderIds = waves[0].orderIds;
      expect(waveOrderIds.indexOf('order1')).toBeLessThan(waveOrderIds.indexOf('order2'));
      expect(waveOrderIds.indexOf('order3')).toBeLessThan(waveOrderIds.indexOf('order2'));
    });

    it('should include reason for each wave', () => {
      const generator = new WaveGenerator(defaultOptions);
      const orders = [
        createOrder('order1', 'urgent', [{ skuId: 'sku1', quantity: 1 }]),
      ];

      const waves = generator.generateWaves(orders, testSkus, testLocations);
      expect(waves[0].reason).toContain('紧急订单');
    });
  });

  describe('splitOrderByStock', () => {
    it('should return null when sufficient stock exists', () => {
      const generator = new WaveGenerator(defaultOptions);
      const order = createOrder('order1', 'medium', [{ skuId: 'sku1', quantity: 5 }]);

      const result = generator.splitOrderByStock(order, testLocations);
      expect(result).toBeNull();
    });

    it('should split order when stock is insufficient', () => {
      const generator = new WaveGenerator(defaultOptions);
      const order = createOrder('order1', 'medium', [{ skuId: 'sku1', quantity: 15 }]);

      const result = generator.splitOrderByStock(order, testLocations);
      expect(result).not.toBeNull();
      expect(result?.fulfilled.items[0].quantity).toBe(10);
      expect(result?.backorder.items[0].quantity).toBe(5);
    });

    it('should create backorder when no stock exists', () => {
      const generator = new WaveGenerator(defaultOptions);
      const order = createOrder('order1', 'medium', [{ skuId: 'sku3', quantity: 5 }]);

      const result = generator.splitOrderByStock(order, testLocations);
      expect(result).not.toBeNull();
      expect(result?.fulfilled.items.length).toBe(0);
      expect(result?.backorder.items[0].quantity).toBe(5);
    });

    it('should handle multiple items with different stock levels', () => {
      const generator = new WaveGenerator(defaultOptions);
      const order = createOrder('order1', 'medium', [
        { skuId: 'sku1', quantity: 15 },
        { skuId: 'sku2', quantity: 3 },
      ]);

      const result = generator.splitOrderByStock(order, testLocations);
      expect(result).not.toBeNull();
      const fulfilledSku1 = result?.fulfilled.items.find((i) => i.skuId === 'sku1');
      const fulfilledSku2 = result?.fulfilled.items.find((i) => i.skuId === 'sku2');
      expect(fulfilledSku1?.quantity).toBe(10);
      expect(fulfilledSku2?.quantity).toBe(3);
      expect(result?.backorder.items.length).toBe(1);
    });
  });
});
