import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ModuleDetailDto, ModuleDto, ModuleService } from './module.service';

describe('ModuleService', () => {
  let service: ModuleService;
  let httpMock: HttpTestingController;

  const beispielModule: ModuleDto[] = [
    {
      code: 'B11',
      name: 'Programmierung 1',
      semester: 1,
      type: 'P',
      lp: 6,
      lectureHours: 4,
      exerciseHours: 2,
      term: 'WS',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ModuleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sollte die Modulliste ohne Filter über GET /api/modules laden', () => {
    service.getModules().subscribe((module) => {
      expect(module).toEqual(beispielModule);
    });

    const req = httpMock.expectOne('/api/modules');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(beispielModule);
  });

  it('sollte die englischen Query-Parameter semester, type und term mitsenden', () => {
    service.getModules({ semester: 3, type: 'P', term: 'WS' }).subscribe((module) => {
      expect(module).toEqual(beispielModule);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/modules' &&
        r.params.get('semester') === '3' &&
        r.params.get('type') === 'P' &&
        r.params.get('term') === 'WS',
    );
    expect(req.request.method).toBe('GET');
    req.flush(beispielModule);
  });

  it('sollte leere oder null-Filterwerte nicht als Query-Parameter senden', () => {
    service.getModules({ semester: null, type: 'WP', term: null }).subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/modules' && r.params.keys().length === 1 && r.params.get('type') === 'WP',
    );
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('sollte die Detaildaten eines Moduls über GET /api/modules/{code} laden', () => {
    const beispielDetail: ModuleDetailDto = {
      code: 'B34',
      name: 'Softwareentwicklungsprojekt',
      semester: 3,
      type: 'P',
      area: 'FACH',
      hasChoice: false,
      lp: 10,
      lectureHours: 0,
      exerciseHours: 6,
      level: '1b',
      term: 'WS',
      countsForFinalGrade: true,
      graded: true,
      prerequisites: [
        { kind: 'NOTWENDIG', moduleCode: 'B11', moduleName: 'Programmierung 1' },
        { kind: 'EMPFOHLEN', moduleCode: 'B21', moduleName: 'Programmierung 2' },
      ],
    };

    service.getModule('B34').subscribe((detail) => {
      expect(detail).toEqual(beispielDetail);
    });

    const req = httpMock.expectOne('/api/modules/B34');
    expect(req.request.method).toBe('GET');
    req.flush(beispielDetail);
  });
});
