import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { method, originalUrl, ip } = req;
      const { statusCode } = res;

      console.log(
        `[${new Date().toISOString()}] ${method} : ${ip} -> ${originalUrl} ${statusCode} - ${duration}ms`,
      );

      if (process.env.NODE_ENV === 'development' && Object.keys(req.body || {}).length > 0) {
        console.log('Request Body:', req.body);
      }
    });

    next();
  }
}
