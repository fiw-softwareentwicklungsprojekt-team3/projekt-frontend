import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlanResponse } from '../../core/services/plan.service';
import { PlanComponent } from './plan.component';

describe('PlanComponent', () => {
  let fixture: ComponentFixture<PlanComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(PlanComponent);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('sollte während des Ladens einen Ladezustand anzeigen', () => {
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Studienplan wird geladen',
    );

    httpMock.expectOne('/api/plan').flush({
      startSemester: 'WS 2026',
      totalLp: 0,
      maxLpPerSemester: 30,
      semesters: [],
    });
  });

  it('sollte LP und SWS pro Semester anzeigen', () => {
    fixture.detectChanges();

    const plan: PlanResponse = {
      startSemester: 'WS 2026',
      totalLp: 30,
      maxLpPerSemester: 30,
      semesters: [{
        semester: 'WS 2026',
        lp: 30,
        sws: 26,
        lpLimitExceeded: false,
        entries: [{
          id: 1,
          moduleCode: 'B11',
          moduleName: 'Programmierung 1',
          lp: 6,
          recommendedSemester: 1,
          offerCode: null,
          offerName: null,
          courseCode: null,
          courseTitle: null,
          prerequisitesMet: true,
          violations: [],
        }],
      }],
    };

    httpMock.expectOne('/api/plan').flush(plan);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('WS 2026');
    expect(text).toContain('30');
    expect(text).toContain('LP');
    expect(text).toContain('26');
    expect(text).toContain('SWS');
  });

  it('sollte bei genau 30 LP keine Warnung anzeigen', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/plan').flush({
      startSemester: 'WS 2026',
      totalLp: 30,
      maxLpPerSemester: 30,
      semesters: [{
        semester: 'WS 2026',
        lp: 30,
        sws: 20,
        lpLimitExceeded: false,
        entries: [],
      }],
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('.warnung')).toBeNull();
  });

  it('sollte bei 31 LP eine Warnung anzeigen', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/plan').flush({
      startSemester: 'WS 2026',
      totalLp: 31,
      maxLpPerSemester: 30,
      semesters: [{
        semester: 'WS 2026',
        lp: 31,
        sws: 20,
        lpLimitExceeded: true,
        entries: [],
      }],
    });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.warnung')).not.toBeNull();
    expect(element.textContent).toContain('31 LP');
    expect(element.textContent).toContain('Limit von 30 LP');
  });

  it('sollte einen leeren Plan anzeigen', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/plan').flush({
      startSemester: 'WS 2026',
      totalLp: 0,
      maxLpPerSemester: 30,
      semesters: [],
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Noch keine Module eingeplant.',
    );
  });

  it('sollte einen Backend-Fehler anzeigen', () => {
    fixture.detectChanges();

    httpMock.expectOne('/api/plan').flush(
      { message: 'Der Studienplan konnte nicht geladen werden.' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Der Studienplan konnte nicht geladen werden.',
    );
  });
});
