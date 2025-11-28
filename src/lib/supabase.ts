// Local API client to replace Supabase
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3500';

let authToken: string | null = localStorage.getItem('auth_token');
let authListeners: ((event: string, session: any) => void)[] = [];

const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const headers: any = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  },

  // Auth methods
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        console.log('Attempting login to:', `${API_URL}/api/auth/login`);
        const data = await apiClient.request('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        
        console.log('Login successful, received:', data);
        authToken = data.session.access_token;
        localStorage.setItem('auth_token', data.session.access_token);
        
        // Notify listeners of sign in
        const user = { id: data.user.id, email: data.user.email, ...data.user };
        authListeners.forEach(callback => callback('SIGNED_IN', { user, access_token: authToken }));
        
        return { data: { user, session: data.session }, error: null };
      } catch (error: any) {
        console.error('Login error:', error);
        return { data: { user: null, session: null }, error };
      }
    },

    async signOut() {
      authToken = null;
      localStorage.removeItem('auth_token');
      await apiClient.request('/api/auth/logout', { method: 'POST' }).catch(() => {});
      
      // Notify listeners of sign out
      authListeners.forEach(callback => callback('SIGNED_OUT', null));
      
      return { error: null };
    },

    async getSession() {
      if (!authToken) {
        return { data: { session: null }, error: null };
      }

      try {
        const response = await apiClient.request('/api/auth/me');
        const user = response.user;
        return { 
          data: { 
            session: { 
              user: { id: user.id, email: user.email, ...user },
              access_token: authToken 
            } 
          }, 
          error: null 
        };
      } catch (error) {
        authToken = null;
        localStorage.removeItem('auth_token');
        return { data: { session: null }, error: null };
      }
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      authListeners.push(callback);
      
      // Call immediately with current state
      setTimeout(() => {
        if (authToken) {
          apiClient.request('/api/auth/me')
            .then(response => {
              const user = response.user;
              callback('SIGNED_IN', {
                user: { id: user.id, email: user.email, ...user },
                access_token: authToken
              });
            })
            .catch(() => {
              callback('SIGNED_OUT', null);
            });
        } else {
          callback('SIGNED_OUT', null);
        }
      }, 100);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              authListeners = authListeners.filter(listener => listener !== callback);
            }
          }
        }
      };
    }
  },

  // Database methods
  from(table: string) {
    return {
      select(_columns: string = '*') {
        let query = '';
        let filters: any = {};

        const builder = {
          eq(column: string, value: any) {
            filters[column] = value;
            return builder;
          },
          in(column: string, values: any[]) {
            filters[column] = { in: values };
            return builder;
          },
          order(column: string, options?: any) {
            query += `&order=${column}${options?.ascending === false ? ':desc' : ':asc'}`;
            return builder;
          },
          limit(count: number) {
            query += `&limit=${count}`;
            return builder;
          },
          maybeSingle() {
            return this.then((data: any) => ({ data: data[0] || null, error: null }));
          },
          single() {
            return this.then((data: any) => ({ data: data[0], error: data[0] ? null : new Error('No data') }));
          },
          async then(resolve: any, reject?: any) {
            try {
              const data = await this.execute();
              resolve({ data, error: null });
            } catch (error) {
              reject ? reject(error) : resolve({ data: null, error });
            }
          },
          async execute() {
            let endpoint = `/api/${table}`;
            const params = new URLSearchParams();
            
            Object.entries(filters).forEach(([key, value]) => {
              if (value && typeof value === 'object' && 'in' in value) {
                // Handle 'in' filter
                (value as any).in.forEach((val: any) => params.append(key, String(val)));
              } else {
                params.append(key, String(value));
              }
            });
            
            const queryString = params.toString();
            if (queryString) {
              endpoint += `?${queryString}${query}`;
            } else if (query) {
              endpoint += `?${query.substring(1)}`;
            }

            return apiClient.request(endpoint);
          },
          async all() {
            try {
              const data = await this.execute();
              return { data, error: null };
            } catch (error) {
              return { data: null, error };
            }
          }
        };

        // Make the builder awaitable
        return new Proxy(builder, {
          get(target, prop) {
            if (prop === 'then') {
              return target.then.bind(target);
            }
            if (prop === 'catch') {
              return (reject: any) => target.then(undefined, reject);
            }
            return target[prop as keyof typeof target];
          }
        });
      },

      async insert(values: any) {
        const data = await apiClient.request(`/api/${table}`, {
          method: 'POST',
          body: JSON.stringify(Array.isArray(values) ? values[0] : values),
        });
        return { data, error: null };
      },

      update(values: any) {
        const updateValues = values;
        return {
          eq: function(_column: string, value: any) {
            return apiClient.request(`/api/${table}/${value}`, {
              method: 'PATCH',
              body: JSON.stringify(updateValues),
            }).then((data: any) => ({ data, error: null }));
          }
        };
      },

      delete() {
        return {
          eq: function(_column: string, value: any) {
            return apiClient.request(`/api/${table}/${value}`, {
              method: 'DELETE',
            }).then((data: any) => ({ data, error: null }));
          }
        };
      }
    };
  }
};

export const supabase = apiClient as any;
