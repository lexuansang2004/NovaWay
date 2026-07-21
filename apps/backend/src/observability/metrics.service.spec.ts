import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('renders all known metrics with HELP/TYPE lines even before any increment', () => {
    const output = service.render();

    expect(output).toContain('# HELP http_requests_total');
    expect(output).toContain('# TYPE http_requests_total counter');
    expect(output).toContain('http_requests_total 0');
    expect(output).toContain('# TYPE ws_connections_current gauge');
  });

  it('increments a labeled counter and renders it with labels', () => {
    service.increment('http_requests_total', { method: 'GET', status: '200' });
    service.increment('http_requests_total', { method: 'GET', status: '200' });

    const output = service.render();

    expect(output).toContain('http_requests_total{method="GET",status="200"} 2');
  });

  it('tracks separate label combinations independently', () => {
    service.increment('http_requests_total', { method: 'GET', status: '200' });
    service.increment('http_requests_total', { method: 'POST', status: '400' });

    const output = service.render();

    expect(output).toContain('http_requests_total{method="GET",status="200"} 1');
    expect(output).toContain('http_requests_total{method="POST",status="400"} 1');
  });

  it('gaugeIncrement never goes below zero', () => {
    service.gaugeIncrement('ws_connections_current', {}, -1);

    expect(service.render()).toContain('ws_connections_current 0');
  });

  it('gaugeSet and gaugeIncrement update the same gauge', () => {
    service.gaugeSet('ws_connections_current', {}, 5);
    service.gaugeIncrement('ws_connections_current', {}, -2);

    expect(service.render()).toContain('ws_connections_current 3');
  });
});
