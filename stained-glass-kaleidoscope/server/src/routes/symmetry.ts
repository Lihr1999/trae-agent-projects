import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  computeSymmetryGroup,
  checkSeamClosure,
  SymmetryConfig,
} from '../algorithms/symmetryGroups.js';

interface SymmetryRequest extends SymmetryConfig {}

export async function symmetryRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    '/api/symmetry/matrix',
    async (
      request: FastifyRequest<{ Body: SymmetryRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const config = request.body;
        const result = computeSymmetryGroup(config);

        const seamCheck = checkSeamClosure(config.mirrorAngle);

        return reply.send({
          matrices: result.matrices,
          generators: result.generators,
          fundamentalDomain: result.fundamentalDomain,
          warnings: result.warnings,
          seamInfo: seamCheck,
        });
      } catch (error) {
        fastify.log.error(`对称群计算错误: ${error}`);
        return reply.status(500).send({
          error: '对称群计算失败',
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  );
}
