-- Add violation_id to exception table to link exceptions with violations
ALTER TABLE "exception" ADD COLUMN "violation_id" uuid;

-- Add foreign key constraint
ALTER TABLE "exception" ADD CONSTRAINT "exception_violation_id_violations_id_fk" 
  FOREIGN KEY ("violation_id") REFERENCES "violations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- Add index for performance
CREATE INDEX "idx_exception_violation_id" ON "exception"("violation_id");

-- Add comment
COMMENT ON COLUMN "exception"."violation_id" IS 'Link to the violation record that was created from this exception';

