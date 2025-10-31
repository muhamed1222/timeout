// Фабрика для создания репозиториев
import { IRepositoryFactory, IRepository, IReadOnlyRepository, IWriteOnlyRepository } from './RepositoryInterface';
import { ImprovedEmployeeRepository } from './ImprovedEmployeeRepository';
import { Employee } from '../../../shared/domain/entities/Employee';

export class RepositoryFactory implements IRepositoryFactory {
  private static instance: RepositoryFactory;
  private repositories = new Map<string, any>();

  private constructor() {}

  static getInstance(): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory();
    }
    return RepositoryFactory.instance;
  }

  createRepository<T, ID = string>(entityName: string): IRepository<T, ID> {
    // Проверяем кэш
    if (this.repositories.has(entityName)) {
      return this.repositories.get(entityName);
    }

    let repository: IRepository<T, ID>;

    switch (entityName.toLowerCase()) {
    case 'employee':
      repository = new ImprovedEmployeeRepository() as IRepository<T, ID>;
      break;
    default:
      throw new Error(`Repository for entity '${entityName}' not implemented`);
    }

    // Кэшируем репозиторий
    this.repositories.set(entityName, repository);
    
    console.log(`Repository created for entity: ${entityName}`);
    return repository;
  }

  createReadOnlyRepository<T, ID = string>(entityName: string): IReadOnlyRepository<T, ID> {
    const repository = this.createRepository<T, ID>(entityName);
    
    // Возвращаем только read-only методы
    return {
      findById: repository.findById.bind(repository),
      findByIds: repository.findByIds.bind(repository),
      findAll: repository.findAll.bind(repository),
      findBy: repository.findBy.bind(repository),
      findOne: repository.findOne.bind(repository),
      search: repository.search.bind(repository),
      count: repository.count.bind(repository),
      exists: repository.exists.bind(repository),
      findPaginated: repository.findPaginated.bind(repository),
      getStats: repository.getStats.bind(repository)
    };
  }

  createWriteOnlyRepository<T, ID = string>(entityName: string): IWriteOnlyRepository<T, ID> {
    const repository = this.createRepository<T, ID>(entityName);
    
    // Возвращаем только write-only методы
    return {
      create: repository.create.bind(repository),
      update: repository.update.bind(repository),
      delete: repository.delete.bind(repository),
      deleteMany: repository.deleteMany.bind(repository),
      beginTransaction: repository.beginTransaction.bind(repository),
      withTransaction: repository.withTransaction.bind(repository)
    };
  }

  // Получение конкретного репозитория
  getEmployeeRepository(): ImprovedEmployeeRepository {
    return this.createRepository<Employee, string>('employee') as ImprovedEmployeeRepository;
  }

  // Очистка кэша репозиториев
  clearCache(): void {
    this.repositories.clear();
    console.log('Repository cache cleared');
  }

  // Получение списка зарегистрированных репозиториев
  getRegisteredRepositories(): string[] {
    return Array.from(this.repositories.keys());
  }

  // Проверка существования репозитория
  hasRepository(entityName: string): boolean {
    return this.repositories.has(entityName);
  }

  // Получение информации о фабрике
  getInfo(): {
    registeredRepositories: string[];
    cacheSize: number;
    } {
    return {
      registeredRepositories: this.getRegisteredRepositories(),
      cacheSize: this.repositories.size
    };
  }
}

// Singleton instance
export const repositoryFactory = RepositoryFactory.getInstance();



