import type { Order, SKU, Location } from '../types';

export interface WaveGenerationOptions {
  maxOrdersPerWave: number;
  maxItemsPerWave: number;
  priorityWeights: { low: number; medium: number; high: number; urgent: number };
}

export class WaveGenerator {
  private options: WaveGenerationOptions;

  constructor(options: WaveGenerationOptions) {
    this.options = options;
  }

  public generateWaves(
    orders: Order[],
    skus: SKU[],
    locations: Location[]
  ): { orderIds: string[]; reason: string }[] {
    const pendingOrders = orders.filter((o) => o.status === 'pending');

    if (pendingOrders.length === 0) {
      return [];
    }

    const sortedOrders = this.sortOrdersByPriorityAndSimilarity(pendingOrders, skus, locations);

    const waves: { orderIds: string[]; reason: string }[] = [];
    let currentWave: Order[] = [];
    let currentItemCount = 0;

    for (const order of sortedOrders) {
      const orderItemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

      if (
        currentWave.length >= this.options.maxOrdersPerWave ||
        currentItemCount + orderItemCount > this.options.maxItemsPerWave
      ) {
        if (currentWave.length > 0) {
          waves.push({
            orderIds: currentWave.map((o) => o.id),
            reason: this.generateWaveReason(currentWave),
          });
          currentWave = [];
          currentItemCount = 0;
        }
      }

      currentWave.push(order);
      currentItemCount += orderItemCount;
    }

    if (currentWave.length > 0) {
      waves.push({
        orderIds: currentWave.map((o) => o.id),
        reason: this.generateWaveReason(currentWave),
      });
    }

    return waves;
  }

  private sortOrdersByPriorityAndSimilarity(
    orders: Order[],
    skus: SKU[],
    locations: Location[]
  ): Order[] {
    const priorityScore: Record<string, number> = {
      low: this.options.priorityWeights.low,
      medium: this.options.priorityWeights.medium,
      high: this.options.priorityWeights.high,
      urgent: this.options.priorityWeights.urgent,
    };

    return orders.sort((a, b) => {
      const scoreA = priorityScore[a.priority] || 1;
      const scoreB = priorityScore[b.priority] || 1;

      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      const similarityA = this.calculateSimilarityScore(a, orders, skus, locations);
      const similarityB = this.calculateSimilarityScore(b, orders, skus, locations);

      return similarityB - similarityA;
    });
  }

  private calculateSimilarityScore(
    order: Order,
    allOrders: Order[],
    skus: SKU[],
    locations: Location[]
  ): number {
    let score = 0;

    const orderSkuIds = new Set(order.items.map((item) => item.skuId));

    for (const otherOrder of allOrders) {
      if (otherOrder.id === order.id) continue;

      const commonSkus = otherOrder.items.filter((item) => orderSkuIds.has(item.skuId)).length;
      score += commonSkus * 10;
    }

    const categories = new Set<string>();
    for (const item of order.items) {
      const sku = skus.find((s) => s.id === item.skuId);
      if (sku) {
        categories.add(sku.category);
      }
    }
    score += (10 - categories.size) * 5;

    return score;
  }

  private generateWaveReason(orders: Order[]): string {
    const priorities = orders.map((o) => o.priority);
    const hasUrgent = priorities.includes('urgent');
    const hasHigh = priorities.includes('high');

    const categories = new Set<string>();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        categories.add(item.skuName);
      });
    });

    let reason = '';
    if (hasUrgent) {
      reason += '紧急订单';
    } else if (hasHigh) {
      reason += '高优先级订单';
    } else {
      reason += '常规订单';
    }

    reason += `，共${orders.length}个订单`;

    if (categories.size <= 3) {
      reason += `，商品相似度高（${categories.size}类商品）`;
    }

    return reason;
  }

  public splitOrderByStock(
    order: Order,
    locations: Location[]
  ): { fulfilled: Order; backorder: Order } | null {
    const fulfilledItems: typeof order.items = [];
    const backorderItems: typeof order.items = [];

    for (const item of order.items) {
      const totalStock = locations
        .filter((l) => l.skuId === item.skuId && l.status === 'occupied')
        .reduce((sum, l) => sum + l.quantity, 0);

      if (totalStock >= item.quantity) {
        fulfilledItems.push(item);
      } else if (totalStock > 0) {
        fulfilledItems.push({ ...item, quantity: totalStock });
        backorderItems.push({ ...item, quantity: item.quantity - totalStock });
      } else {
        backorderItems.push(item);
      }
    }

    if (backorderItems.length === 0) {
      return null;
    }

    return {
      fulfilled: { ...order, items: fulfilledItems },
      backorder: { ...order, id: `${order.id}_bo`, orderNo: `${order.orderNo}_BO`, items: backorderItems },
    };
  }
}
