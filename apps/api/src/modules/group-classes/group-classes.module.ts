import { Module } from '@nestjs/common';
import { GroupClassesService } from './group-classes.service';
import { GroupClassesController } from './group-classes.controller';

@Module({
  controllers: [GroupClassesController],
  providers: [GroupClassesService],
  exports: [GroupClassesService],
})
export class GroupClassesModule {}
