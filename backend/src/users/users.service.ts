import { Injectable, NotFoundException } from '@nestjs/common';
import { mockDb, MockUser } from '../common/mock-db';

@Injectable()
export class UsersService {
  findAll(collegeId?: string) {
    if (collegeId) {
      return mockDb.users.filter((u) => u.collegeId === collegeId);
    }
    return mockDb.users;
  }

  findOne(id: string) {
    const user = mockDb.users.find((u) => u.id === id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  create(data: Partial<MockUser>) {
    const newUser: MockUser = {
      id: `usr-${Date.now()}`,
      email: data.email || `user${Date.now()}@aknu.edu.in`,
      phone: data.phone || '9848099999',
      name: data.name || 'New Staff User',
      role: data.role || 'COLLEGE_STAFF',
      courseSection: data.courseSection || 'UG',
      collegeId: data.collegeId,
      isActive: true,
    };
    mockDb.users.push(newUser);
    return newUser;
  }

  update(id: string, data: Partial<MockUser>) {
    const index = mockDb.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new NotFoundException(`User ${id} not found`);
    }
    mockDb.users[index] = { ...mockDb.users[index], ...data };
    return mockDb.users[index];
  }
}
