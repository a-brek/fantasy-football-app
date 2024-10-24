import { TestBed } from '@angular/core/testing';

import { FantasyFootballService } from './fantasy-football.service';

describe('FantasyFootballService', () => {
  let service: FantasyFootballService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FantasyFootballService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
