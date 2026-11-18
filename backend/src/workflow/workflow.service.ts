import { Injectable, NotFoundException } from '@nestjs/common';
import { mockDb, MockWorkflowQuery } from '../common/mock-db';

@Injectable()
export class WorkflowService {
  findQueries(query?: { collegeId?: string; courseGroupId?: string; status?: string }) {
    let result = mockDb.workflowQueries;
    if (query?.collegeId) {
      result = result.filter((q) => q.collegeId === query.collegeId);
    }
    if (query?.courseGroupId && query.courseGroupId !== 'ALL') {
      result = result.filter((q) => q.courseGroupId === query.courseGroupId);
    }
    if (query?.status) {
      result = result.filter((q) => q.status === query.status);
    }

    return result.map((q) => {
      const col = mockDb.colleges.find((c) => c.id === q.collegeId);
      const from = mockDb.users.find((u) => u.id === q.fromUserId);
      return {
        ...q,
        collegeName: col?.name,
        fromUserName: from?.name || 'CDC Staff',
      };
    });
  }

  createQuery(dto: {
    collegeId: string;
    courseGroupId: string;
    demandId?: string;
    proceedingId?: string;
    stage: 'CLERK' | 'SUPERINTENDENT' | 'DEAN' | 'COLLEGE';
    fromUserId: string;
    subject: string;
    queryText: string;
  }) {
    const newQuery: MockWorkflowQuery = {
      id: `wq-${Date.now()}`,
      collegeId: dto.collegeId,
      courseGroupId: dto.courseGroupId,
      demandId: dto.demandId,
      proceedingId: dto.proceedingId,
      stage: dto.stage,
      fromUserId: dto.fromUserId,
      subject: dto.subject,
      queryText: dto.queryText,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    mockDb.workflowQueries.push(newQuery);

    this.recordAudit({
      userId: dto.fromUserId,
      action: 'CREATE_QUERY',
      entityName: 'WorkflowQuery',
      entityId: newQuery.id,
      newValue: JSON.stringify(newQuery),
    });

    return newQuery;
  }

  respondToQuery(id: string, responseText: string, userId: string) {
    const query = mockDb.workflowQueries.find((q) => q.id === id);
    if (!query) {
      throw new NotFoundException(`Query ${id} not found`);
    }

    query.responseText = responseText;
    query.status = 'RESOLVED';
    query.resolvedAt = new Date().toISOString();

    this.recordAudit({
      userId,
      action: 'RESOLVE_QUERY',
      entityName: 'WorkflowQuery',
      entityId: query.id,
      newValue: responseText,
    });

    return query;
  }

  recordAudit(data: { userId?: string; action: string; entityName: string; entityId?: string; oldValue?: string; newValue?: string; ip?: string }) {
    const log = {
      id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: data.userId,
      action: data.action,
      entityName: data.entityName,
      entityId: data.entityId,
      oldValue: data.oldValue,
      newValue: data.newValue,
      ipAddress: data.ip || '127.0.0.1',
      createdAt: new Date().toISOString(),
    };
    mockDb.auditLogs.unshift(log);
    return log;
  }

  getAuditLogs(limit: number = 50) {
    return mockDb.auditLogs.slice(0, limit);
  }
}
