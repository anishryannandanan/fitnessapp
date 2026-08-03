import { Module } from '@nestjs/common';
import { TrainerAssignmentsController } from './trainer-assignments.controller';
import { TrainerAssignmentsService } from './trainer-assignments.service';

@Module({
  controllers: [TrainerAssignmentsController],
  providers: [TrainerAssignmentsService],
  exports: [TrainerAssignmentsService],
})
export class TrainerAssignmentsModule {}
