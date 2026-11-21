import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PlanResponse, PlanService } from './plan.service';

/** Prüft, dass GET /api/plan aufgerufen und die Antwort unverändert durchgereicht wird. */
describe('PlanService', () => {
  let service: PlanService;
  let httpMock: HttpTestingController;

  const beispielPlan: PlanResponse = {
    startSemester: 'WS 2026',
    totalLp: 14,
    semesters: [
      {
        semester: 'WS 2026',
        lp: 4,
        entries: [
          {
            id: 1,
            moduleCode: 'B16',
            moduleName: '1. Fremdsprache 1',
            lp: 4,
            recommendedSemester: 1,
            offerCode: 'EN_B2.1',
            offerName: 'Englisch Fachsprache B2.1 (Technik)',
            courseCode: null,
            courseTitle: null,
            prerequisitesMet: true,
            violations: [],
          },
        ],
      },
      {
        semester: 'WS 2027',
        lp: 10,
        entries: [
          {
            id: 2,
            moduleCode: 'B34',
            moduleName: 'Softwareentwicklungsprojekt',
            lp: 10,
            recommendedSemester: 3,
            offerCode: null,
            offerName: null,
            courseCode: null,
            courseTitle: null,
            prerequisitesMet: false,
            violations: [
              {
                severity: 'FEHLER',
                prerequisiteCode: 'B11',
                message: 'Voraussetzung B11 für B34 ist nicht erfüllt.',
              },
            ],
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(PlanService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sollte den Plan per GET /api/plan laden', () => {
    let antwort: PlanResponse | undefined;
    service.getPlan().subscribe((plan) => (antwort = plan));

    const req = httpMock.expectOne('/api/plan');
    expect(req.request.method).toBe('GET');
    req.flush(beispielPlan);

    expect(antwort).toEqual(beispielPlan);
    expect(antwort?.semesters[1].entries[0].prerequisitesMet).toBe(false);
    expect(antwort?.semesters[1].entries[0].violations[0].severity).toBe('FEHLER');
  });

  it('sollte einen leeren Plan durchreichen', () => {
    let antwort: PlanResponse | undefined;
    service.getPlan().subscribe((plan) => (antwort = plan));

    httpMock.expectOne('/api/plan').flush({ startSemester: 'WS 2026', totalLp: 0, semesters: [] });

    expect(antwort?.semesters).toEqual([]);
    expect(antwort?.totalLp).toBe(0);
  });
});
