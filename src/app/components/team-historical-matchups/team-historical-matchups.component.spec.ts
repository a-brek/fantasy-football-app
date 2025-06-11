import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamHistoricalMatchupsComponent } from './team-historical-matchups.component';

describe('TeamHistoricalMatchupsComponent', () => {
  let component: TeamHistoricalMatchupsComponent;
  let fixture: ComponentFixture<TeamHistoricalMatchupsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamHistoricalMatchupsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TeamHistoricalMatchupsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
