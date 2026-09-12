import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmConfigModule } from './core/database/typeorm.module';
import { LoggerMiddleware } from './core/middlewares/logger.middleware';
import { AuthModule } from './services/auth/auth.module';
import { UsersModule } from './services/users/users.module';
import { TmdbModule } from './services/tmdb/tmdb.module';
import { MoviesModule } from './services/movies/movies.module';
import { SimilaritiesModule } from './services/similarities/similarities.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmConfigModule,
    AuthModule,
    UsersModule,
    TmdbModule,
    SimilaritiesModule,
    MoviesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
