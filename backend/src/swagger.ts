import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ATE绩效管理系统 API',
      version: '2.0.0',
      description: 'ATE绩效管理系统 Phase 2 API文档 - 包含360度互评和绩效面谈模块',
      contact: {
        name: '金凯博自动化',
        email: 'admin@jkb-auto.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '开发环境'
      },
      {
        url: 'https://performance-management-api-three.vercel.app',
        description: '生产环境'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            error: { type: 'string' }
          }
        },
        ReviewCycle: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: '2026年Q1互评' },
            description: { type: 'string', example: '第一季度360度互评' },
            start_date: { type: 'string', format: 'date', example: '2026-01-01' },
            end_date: { type: 'string', format: 'date', example: '2026-03-31' },
            status: { type: 'string', enum: ['draft', 'active', 'completed', 'cancelled'], example: 'draft' },
            review_type: { type: 'string', enum: ['peer', '360', 'upward', 'downward'], example: 'peer' },
            is_anonymous: { type: 'boolean', example: false },
            created_by: { type: 'integer', example: 1 }
          },
          required: ['name', 'start_date', 'end_date']
        },
        ReviewRelationship: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            cycle_id: { type: 'integer' },
            reviewer_id: { type: 'integer' },
            reviewee_id: { type: 'integer' },
            relationship_type: { type: 'string', enum: ['peer', 'superior', 'subordinate', 'cross_department'] },
            department_id: { type: 'integer' },
            weight: { type: 'number', example: 1.0 },
            status: { type: 'string', enum: ['pending', 'completed'] }
          }
        },
        PeerReview: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            relationship_id: { type: 'integer' },
            cycle_id: { type: 'integer' },
            reviewer_id: { type: 'integer' },
            reviewee_id: { type: 'integer' },
            teamwork_score: { type: 'number', minimum: 1, maximum: 5 },
            communication_score: { type: 'number', minimum: 1, maximum: 5 },
            professional_score: { type: 'number', minimum: 1, maximum: 5 },
            responsibility_score: { type: 'number', minimum: 1, maximum: 5 },
            innovation_score: { type: 'number', minimum: 1, maximum: 5 },
            total_score: { type: 'number' },
            strengths: { type: 'string' },
            improvements: { type: 'string' },
            overall_comment: { type: 'string' },
            is_anonymous: { type: 'boolean' },
            submitted_at: { type: 'string', format: 'date-time' }
          },
          required: ['relationship_id', 'cycle_id', 'reviewer_id', 'reviewee_id']
        },
        ReviewStatistics: {
          type: 'object',
          properties: {
            reviewee_id: { type: 'integer' },
            reviewee_name: { type: 'string' },
            review_count: { type: 'integer' },
            avg_teamwork: { type: 'number' },
            avg_communication: { type: 'number' },
            avg_professional: { type: 'number' },
            avg_responsibility: { type: 'number' },
            avg_innovation: { type: 'number' },
            avg_total: { type: 'number' }
          }
        },
        InterviewPlan: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string', example: 'Q1绩效面谈' },
            description: { type: 'string' },
            interview_type: { type: 'string', enum: ['quarterly', 'annual', 'probation', 'improvement', 'special'] },
            scheduled_date: { type: 'string', format: 'date' },
            scheduled_time: { type: 'string', example: '14:00' },
            duration_minutes: { type: 'integer', example: 60 },
            manager_id: { type: 'integer' },
            employee_id: { type: 'integer' },
            department_id: { type: 'integer' },
            status: { type: 'string', enum: ['scheduled', 'in_progress', 'completed', 'cancelled'] },
            template_id: { type: 'integer' }
          },
          required: ['title', 'interview_type', 'scheduled_date', 'manager_id', 'employee_id']
        },
        InterviewRecord: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            plan_id: { type: 'integer' },
            employee_id: { type: 'integer' },
            manager_id: { type: 'integer' },
            interview_date: { type: 'string', format: 'date' },
            interview_time: { type: 'string' },
            duration_minutes: { type: 'integer' },
            employee_summary: { type: 'string' },
            manager_feedback: { type: 'string' },
            achievements: { type: 'string' },
            challenges: { type: 'string' },
            strengths: { type: 'string' },
            improvements: { type: 'string' },
            overall_rating: { type: 'string', enum: ['excellent', 'good', 'average', 'below_average', 'poor'] },
            performance_score: { type: 'number' },
            potential_score: { type: 'number' },
            nine_box_performance: { type: 'string' },
            nine_box_potential: { type: 'string' },
            notes: { type: 'string' },
            status: { type: 'string', enum: ['draft', 'submitted', 'confirmed'] }
          },
          required: ['employee_id', 'manager_id', 'interview_date']
        },
        ImprovementPlan: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            interview_record_id: { type: 'integer' },
            employee_id: { type: 'integer' },
            manager_id: { type: 'integer' },
            goal: { type: 'string', example: '提升项目管理能力' },
            description: { type: 'string' },
            category: { type: 'string', enum: ['performance', 'skill', 'behavior', 'knowledge'] },
            priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            start_date: { type: 'string', format: 'date' },
            target_date: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['not_started', 'in_progress', 'completed', 'cancelled'] },
            progress_percentage: { type: 'integer', minimum: 0, maximum: 100 },
            resources_needed: { type: 'string' },
            support_from_manager: { type: 'string' }
          },
          required: ['interview_record_id', 'employee_id', 'manager_id', 'goal']
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./src/routes/*.ts']
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ATE绩效管理系统 API文档'
  }));

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

export { swaggerSpec };
