import { Controller, Post, Body } from '@nestjs/common';
import { LayoutService } from './layout.service';
import { LayoutParams, ASTNodeInput } from './layout.interfaces';

@Controller('layout')
export class LayoutController {
  constructor(private readonly layoutService: LayoutService) {}

  @Post('compute')
  computeLayout(
    @Body() body: { ast: ASTNodeInput; params?: LayoutParams },
  ) {
    const { ast, params } = body;
    return this.layoutService.computeLayout(ast, params || {});
  }
}
