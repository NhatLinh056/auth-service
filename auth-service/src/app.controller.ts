import { Controller, Get, Redirect, Res } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('dashboard')
  @Redirect('/console/dashboard', 302)
  getDashboard() {}

  @Get(['console', 'console/{*path}'])
  serveConsoleSpa(@Res() res: Response) {
    const directPath = join(process.cwd(), 'public', 'index.html');
    const nestedPath = join(process.cwd(), 'auth-service', 'public', 'index.html');
    const htmlPath = existsSync(directPath) ? directPath : nestedPath;
    res.sendFile(htmlPath);
  }
}
