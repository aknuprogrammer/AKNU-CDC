import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { User, Role, CourseGroup } from '@prisma/client';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
  Approve = 'approve',
  Sign = 'sign',
  Acknowledge = 'acknowledge',
  Pay = 'pay',
  Waive = 'waive',
}

export type AppSubjects =
  | 'Proceeding'
  | 'Student'
  | 'Faculty'
  | 'Demand'
  | 'Payment'
  | 'College'
  | 'Course'
  | 'FeeRule'
  | 'LateFeeWaiver'
  | 'WorkflowQuery'
  | 'Report'
  | 'all';

export type AppAbility = MongoAbility<[Action, AppSubjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: Partial<User>): AppAbility {
    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === Role.SUPER_ADMIN || user.role === Role.DEAN_CDC) {
      can(Action.Manage, 'all');
      return build();
    }

    if (user.role === Role.REGISTRAR || user.role === Role.VICE_CHANCELLOR) {
      can(Action.Read, 'all');
      can(Action.Approve, 'Proceeding');
      can(Action.Sign, 'Proceeding');
      return build();
    }

    if (user.role === Role.FINANCE_OFFICER) {
      can(Action.Read, 'all');
      can(Action.Manage, 'Demand');
      can(Action.Manage, 'Payment');
      can(Action.Waive, 'LateFeeWaiver');
      can(Action.Read, 'Report');
      return build();
    }

    if (user.role === Role.SUPERINTENDENT) {
      can(Action.Read, 'all');
      can(Action.Approve, 'Proceeding');
      can(Action.Update, 'Demand');
      can(Action.Read, 'WorkflowQuery');
      return build();
    }

    if (user.role === Role.CLERK) {
      can(Action.Read, 'all');
      can(Action.Create, 'Proceeding');
      can(Action.Update, 'Proceeding');
      can(Action.Create, 'Student');
      can(Action.Update, 'Student');
      return build();
    }

    if (user.role === Role.SECTION_OFFICER) {
      // Course section specific access
      can(Action.Read, 'all');
      can(Action.Manage, 'Proceeding');
      can(Action.Manage, 'Student');
      can(Action.Manage, 'Demand');
      can(Action.Create, 'WorkflowQuery');
      can(Action.Update, 'WorkflowQuery');
      return build();
    }

    if (user.role === Role.COLLEGE_PRINCIPAL || user.role === Role.COLLEGE_STAFF) {
      can(Action.Read, 'Proceeding');
      can(Action.Acknowledge, 'Proceeding');
      can(Action.Manage, 'Student');
      can(Action.Manage, 'Faculty');
      can(Action.Read, 'Demand');
      can(Action.Pay, 'Demand');
      can(Action.Create, 'Payment');
      can(Action.Read, 'Payment');
      can(Action.Create, 'WorkflowQuery');
      can(Action.Read, 'WorkflowQuery');
      can(Action.Read, 'College');
      return build();
    }

    can(Action.Read, 'all');
    return build();
  }
}
